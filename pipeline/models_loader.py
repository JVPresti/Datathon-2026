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

Recibirás un contexto estructurado en formato JSON con la siguiente información:
- user_profile: Datos básicos y saldos.
- uc1: Alertas recientes de transacciones rechazadas o anomalías.
- uc2: El "Gemelo Digital" del usuario (persona financiera y métricas).
- uc3: Recomendaciones de productos calculadas para el usuario.
- uc4: Historial de la conversación e intención detectada.

Los campos de inteligencia artificial que debes interpretar:
- uc2.metrics.ml_nivel_riesgo: nivel de riesgo de liquidez a fin de mes ('bajo', 'moderado', 'alto', 'critico') calculado por un modelo de Random Forest con AUC 0.9999.
- uc2.metrics.ml_alerta_liquidez: si es true, el modelo predice que el usuario podría no cubrir sus compromisos a fin de mes. Menciónalo proactivamente.
- uc2.metrics.ml_ingreso_comprometido_pct: porcentaje del ingreso mensual ya comprometido en cargos fijos.
- uc1.alerts[].iso_is_anomaly: si es true, el IsolationForest clasificó esa transacción como anómala (5% más atípico del historial del usuario).
- uc1.alerts[].iso_anomaly_score: puntuación de anomalía (mayor = más sospechoso). Usa esto para graduar la urgencia de tu respuesta.

Instrucciones:
1. Responde de forma concisa, amigable y proactiva.
2. Si hay alertas en UC1 con iso_is_anomaly=true o iso_anomaly_score alto, trátalas con mayor urgencia y sugiere revisar si el usuario reconoce la operación.
3. Si ml_alerta_liquidez es true, avisa al usuario sobre el riesgo de déficit y sugiere ajustar gastos o usar su inversión Hey.
4. Si ml_nivel_riesgo es 'alto' o 'critico', prioriza esa alerta sobre otras.
5. Si hay una recomendación en UC3, menciónala junto con su valor esperado.
6. Adapta tu tono según la 'persona' de UC2.
7. No expongas la estructura del JSON al usuario ni menciones términos técnicos como 'IsoForest', 'Random Forest' o 'ml_prob_deficit'. Usa lenguaje natural.
"""

def build_prompt_with_context(user_message: str, context: dict) -> str:
    """Ensambla el prompt final inyectando el contexto JSON"""
    context_str = json.dumps(context, indent=2, ensure_ascii=False)
    
    prompt = f"""
--- CONTEXTO DEL USUARIO ---
{context_str}
---------------------------

Mensaje del usuario: "{user_message}"
"""
    return prompt

def generate_havi_response(user_id: str, context: dict, user_message: str, model_name: str = "gemini-2.5-flash") -> str:
    """Llama a la API de Gemini para generar la respuesta de Havi"""
    
    prompt = build_prompt_with_context(user_message, context)
    
    try:
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=HAVI_SYSTEM_PROMPT,
                temperature=0.4,
            ),
        )
        return response.text
    except Exception as e:
        return f"Error interno en Havi (Gemini API): {str(e)}"
