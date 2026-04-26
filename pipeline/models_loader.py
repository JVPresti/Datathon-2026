import os
import json
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv(override=True)

# Inicializar cliente de Gemini
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    client = genai.Client(api_key=api_key)
else:
    client = genai.Client() # Asume que está en el ambiente o fallará

# Prompt base del sistema para Havi
HAVI_SYSTEM_PROMPT = """
Eres Havi, el asistente financiero virtual proactivo y empático de Hey Banco.
Tu objetivo es ayudar a los usuarios con sus finanzas, basándote en su perfil (gemelo digital), alertas de riesgo (UC1) y oportunidades (UC3).

DEBES RESPONDER SIEMPRE EN FORMATO JSON con la siguiente estructura:
{
  "text": "tu respuesta amigable aquí",
  "actions": [
    {"label": "Texto del botón", "action_id": "id_tecnico", "payload": {}}
  ]
}

Acciones técnicas que puedes sugerir en el array "actions":
- move_funds_from_investment: Mover dinero de inversión a débito ante un rechazo (UC1).
- retry_payment: Reintentar una transacción que falló (UC1).
- set_category_limit: Establecer límites de gasto en categorías específicas (UC2).
- view_financial_forecast: Mostrar proyección de saldo a fin de mes (UC2).
- activate_hey_pro: Conversión directa a Hey Pro si detectas cashback perdido (UC3).
- start_payroll_transfer: Iniciar portabilidad de nómina (UC3).
- confirm_transaction: Validar que el usuario reconoce un cargo marcado como anómalo (UC4).
- block_card_temporarily: Bloqueo inmediato ante fraude confirmado por el usuario (UC4).

Instrucciones:
1. Responde de forma concisa, amigable y proactiva.
2. UTILIZA FORMATO MARKDOWN en el campo "text" (negritas, listas, etc.) para mejorar la legibilidad.
3. Si hay alertas en UC1 con iso_is_anomaly=true o iso_anomaly_score alto, trátalas con mayor urgencia y sugiere 'confirm_transaction' o 'block_card_temporarily'.
4. Si ml_alerta_liquidez es true, avisa al usuario sobre el riesgo de déficit y sugiere 'move_funds_from_investment' o 'set_category_limit'.
5. Si detectas que el usuario pierde cashback significativo (UC3), sugiere 'activate_hey_pro'.
6. No menciones términos técnicos como 'IsoForest' o 'JSON' en el campo "text".
7. Si no hay acciones relevantes, deja el array "actions" vacío [].
"""

def build_prompt_with_context(user_message: str, context: dict) -> str:
    """Ensambla el prompt final inyectando el contexto JSON"""
    context_str = json.dumps(context, indent=2, ensure_ascii=False)
    
    prompt = f"""
--- CONTEXTO DEL USUARIO ---
{context_str}
---------------------------

Mensaje del usuario: "{user_message}"

RESPONDE ÚNICAMENTE EN FORMATO JSON como se indicó en las instrucciones del sistema.
"""
    return prompt

def generate_havi_response(user_id: str, context: dict, user_message: str, model_name: str = "gemini-2.5-flash-lite") -> dict:
    """
    Llama a la API de Gemini para generar la respuesta de Havi.
    Retorna un diccionario con {'text': ..., 'actions': ...}
    """
    
    prompt = build_prompt_with_context(user_message, context)
    
    # ── [DEBUG] TODO LO QUE SE ENVÍA A GEMINI ──────────────────────────────
    print("\n" + "="*80)
    print(">>> [SYSTEM INSTRUCTION] <<<")
    print(HAVI_SYSTEM_PROMPT)
    print("\n>>> [USER PROMPT + CONTEXT] <<<")
    print(prompt)
    print("="*80 + "\n")
    # ────────────────────────────────────────────────────────────────────────

    try:
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=HAVI_SYSTEM_PROMPT,
                temperature=0.4,
                response_mime_type="application/json"
            ),
        )
        
        # Intentar parsear el JSON de la respuesta
        try:
            data = json.loads(response.text)
            return {
                "text": data.get("text", "Lo siento, tuve un problema procesando mi respuesta."),
                "actions": data.get("actions", [])
            }
        except:
            # Fallback si no es JSON válido
            return {
                "text": response.text,
                "actions": []
            }
            
    except Exception as e:
        return {
            "text": f"Error interno en Havi (Gemini API): {str(e)}",
            "actions": []
        }
