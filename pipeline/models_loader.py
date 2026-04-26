import os
import json
import time
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv(override=True)

api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    client = genai.Client(api_key=api_key)
else:
    client = genai.Client()

# ── System prompt ────────────────────────────────────────────

HAVI_SYSTEM_PROMPT = """
Eres Havi, el asistente financiero virtual de Hey Banco. Eres proactivo, claro y empático.
Tu objetivo es ayudar al usuario a tomar mejores decisiones financieras usando su contexto (perfil, comportamiento, alertas y oportunidades).

========================
FORMATO DE RESPUESTA (OBLIGATORIO)
========================
Responde SIEMPRE en JSON válido:

{
  "text": "respuesta en markdown",
  "actions": [
    {
      "label": "Texto corto del botón (máx 4 palabras)",
      "action_id": "id_tecnico",
      "payload": {}
    }
  ]
}

- No incluyas texto fuera del JSON.
- El JSON debe ser válido (sin comentarios, sin trailing commas).
- Si no hay acciones relevantes, usa: "actions": [].

========================
ESTILO DE RESPUESTA
========================
- Máximo 3 oraciones (4 solo si es crítico).
- Usa markdown (negritas, listas cortas).
- Lenguaje claro, directo y útil (evita relleno).
- Enfócate en UNA recomendación principal.
- Evita explicaciones largas o técnicas.

========================
REGLAS DE DECISIÓN
========================

1. ALERTAS CRÍTICAS (transacciones sospechosas)
- Si existe una alerta con comportamiento anómalo:
  - Prioridad ALTA.
  - Indica urgencia.
  - Sugiere acción: confirm_transaction.

2. RIESGO DE LIQUIDEZ
- Si hay riesgo de falta de dinero:
  - Sugiere:
    - move_funds_from_investment (si hay fondos disponibles), o
    - set_category_limit (si el problema es gasto).
  - Prioriza la opción más inmediata.

3. OPORTUNIDADES (cashback, beneficios)
- Si el usuario está perdiendo beneficios:
  - Sugiere activate_hey_pro.
  - Incluye el monto estimado en payload.

4. TRANSACCIONES FALLIDAS
- Si un pago falló:
  - Sugiere retry_payment.

5. SIN ALERTAS NI OPORTUNIDADES
- Da un consejo breve y útil.
- No sugieras acciones innecesarias.

========================
REGLAS DE ACCIONES
========================
- Máximo 2 acciones por respuesta.
- Las acciones deben ser relevantes al contexto.
- El payload debe estar completo y correcto.
- No inventes datos; usa solo información disponible.
- Prioriza acciones de alto impacto.

Acciones disponibles:

- move_funds_from_investment
  Payload: {"amount": float, "currency": "MXN"}

- retry_payment
  Payload: {"merchant": "string", "amount": float}

- set_category_limit
  Payload: {"category": "string", "limit": float}

- view_financial_forecast
  Payload: {"target_month": "string"}

- activate_hey_pro
  Payload: {"estimated_cashback": float}

- confirm_transaction
  Payload: {"transaction_id": "string", "amount": float}

========================
RESTRICCIONES
========================
- No menciones términos técnicos (ML, modelos, UC1, etc.).
- No hagas suposiciones sin datos.
- No generes acciones si no hay suficiente información para el payload.
- Evita redundancia entre texto y botones.

========================
OBJETIVO FINAL
========================
Cada respuesta debe ayudar al usuario a:
1) Entender rápidamente la situación
2) Tomar una acción clara e inmediata
"""


def _trim_context(context: dict) -> dict:
    """
    Reduce el tamaño del contexto antes de enviarlo a Gemini.
    Conserva toda la información útil pero elimina verbosidad innecesaria.
    """
    trimmed = {}

    # user_profile: solo campos clave
    if "user_profile" in context:
        p = context["user_profile"]
        trimmed["user_profile"] = {
            "es_hey_pro": p.get("es_hey_pro"),
            "ingreso_mensual_mxn": p.get("ingreso_mensual_mxn"),
            "n_rechazos_30d": p.get("n_rechazos_30d"),
            "productos_activos": p.get("productos_activos", [])[:3],
        }

    # UC1: solo la alerta más urgente
    if "uc1" in context:
        alerts = context["uc1"].get("alerts", [])
        trimmed["uc1"] = {"alerts": alerts[:1]}

    # UC2: métricas clave solamente
    if "uc2" in context:
        m = context["uc2"].get("metrics", {})
        trimmed["uc2"] = {
            "persona": context["uc2"].get("persona"),
            "key_traits": context["uc2"].get("key_traits", [])[:3],
            "metrics": {
                "zona_riesgo": m.get("zona_riesgo"),
                "tendencia_riesgo": m.get("tendencia_riesgo"),
                "top_categoria": m.get("top_categoria"),
                "gasto_total": m.get("gasto_total"),
                "dias_hasta_deficit": m.get("dias_hasta_deficit"),
                "ingreso_restante_estimado": m.get("ingreso_restante_estimado"),
                "ml_alerta_liquidez": m.get("ml_alerta_liquidez"),
                "ml_nivel_riesgo": m.get("ml_nivel_riesgo"),
                "ml_prob_deficit": m.get("ml_prob_deficit"),
            },
        }

    # UC3: solo top 1 recomendación
    if "uc3" in context:
        recs = context["uc3"].get("recommendations", [])
        trimmed["uc3"] = {"recommendations": recs[:1]}

    # UC4: solo 2 turnos más recientes + señales clave
    if "uc4" in context:
        uc4 = context["uc4"]
        trimmed["uc4"] = {
            "intent_top": uc4.get("intent_top"),
            "menciona_fraude": uc4.get("menciona_fraude"),
            "menciona_cashback": uc4.get("menciona_cashback"),
            "iso_txn_is_anomaly": uc4.get("iso_txn_is_anomaly"),
            "alerta_fraude_alta": uc4.get("alerta_fraude_alta"),
            "recent_turns": uc4.get("recent_turns", [])[-2:],
        }

    return trimmed


def _build_fallback_response(context: dict, user_message: str) -> dict:
    """
    Respuesta contextual basada en reglas cuando Gemini no está disponible.
    Usa datos reales de UC1-UC4 para NO ser genérica.
    """
    msg = user_message.lower()
    profile = context.get("user_profile", {})
    uc1 = context.get("uc1", {})
    uc2 = context.get("uc2", {})
    uc3 = context.get("uc3", {})
    uc4 = context.get("uc4", {})

    alerts = uc1.get("alerts", [])
    metrics = uc2.get("metrics", {})
    recs = uc3.get("recommendations", [])
    zona = metrics.get("zona_riesgo", "")
    tendencia = metrics.get("tendencia_riesgo", "")
    top_cat = metrics.get("top_categoria", "")
    ingreso_restante = metrics.get("ingreso_restante_estimado") or 0
    dias_deficit = metrics.get("dias_hasta_deficit")
    ml_alerta = metrics.get("ml_alerta_liquidez", False)
    actions = []

    # ── UC4: fraude / cargo no reconocido ────────────────────
    if uc4.get("alerta_fraude_alta") or (
        uc4.get("iso_txn_is_anomaly")
        and any(k in msg for k in ["fraude", "no reconozco", "extraño", "sospech", "cargo raro"])
    ):
        text = (
            "Detecté una transacción que **sale de tu patrón habitual**. "
            "Te recomiendo revisarla de inmediato para proteger tu cuenta."
        )
        actions.append({"label": "Revisar cargo", "action_id": "confirm_transaction", "payload": {}})
        return {"text": text, "actions": actions}

    # ── UC1: rechazo de pago ──────────────────────────────────
    if alerts and any(k in msg for k in ["pago", "cargo", "rechaz", "tarjeta", "no pasó", "no cargó"]):
        a = alerts[0]
        ctx_a = a.get("context", {})
        monto = ctx_a.get("monto", 0)
        motivo = ctx_a.get("motivo", "").replace("_", " ")
        saldo_alt = ctx_a.get("saldo_inversion_disponible", 0)
        text = f"Veo que tuviste un cargo rechazado por **${monto:,.2f} MXN** ({motivo}). "
        if saldo_alt > monto:
            text += f"Tienes **${saldo_alt:,.0f}** disponibles en inversión. ¿Lo movemos a tu cuenta?"
            actions.append({
                "label": "Mover fondos",
                "action_id": "move_funds_from_investment",
                "payload": {"amount": round(monto, 2), "currency": "MXN"},
            })
        else:
            text += "¿Quieres que revisemos tus opciones de pago?"
        return {"text": text, "actions": actions}

    # ── UC2: análisis de gastos / liquidez ────────────────────
    if any(k in msg for k in ["gasto", "mes", "ahorro", "liquidez", "cuanto", "fin de mes", "queda", "proyecc"]):
        if ml_alerta or zona in ("Precaucion", "Precaución", "Critica", "Crítico"):
            text = f"Tu zona de riesgo es **{zona}** con tendencia **{tendencia}**. "
            if dias_deficit is not None:
                text += f"El modelo proyecta un posible déficit en ~**{dias_deficit:.0f} días**. "
            if top_cat:
                text += f"Tu mayor gasto es en **{top_cat}** — considera ponerle un límite."
                actions.append({
                    "label": f"Limitar {top_cat}",
                    "action_id": "set_category_limit",
                    "payload": {"category": top_cat, "limit": 500.0},
                })
        else:
            text = f"Tus finanzas están en zona **{zona if zona else 'Saludable'}** ({tendencia}). "
            if ingreso_restante > 0:
                text += f"Te queda un estimado de **${ingreso_restante:,.0f} MXN** disponible. "
            if top_cat:
                text += f"Mayor gasto: **{top_cat}**."
        actions.append({"label": "Ver proyección", "action_id": "view_financial_forecast", "payload": {}})
        return {"text": text, "actions": actions}

    # ── UC3: Hey Pro / cashback ───────────────────────────────
    if recs and any(k in msg for k in ["pro", "cashback", "beneficio", "ganar", "puntos", "activ"]):
        rec = recs[0]
        cashback = rec.get("cashback_perdido_mes", 0)
        text = (
            f"Con tus compras actuales estás dejando de ganar **${cashback:,.2f} MXN/mes** en cashback. "
            f"Al año serían **${cashback * 12:,.2f} MXN**. Activar Hey Pro solo requiere domiciliar tu nómina."
        )
        actions.append({
            "label": "Activar Hey Pro",
            "action_id": "activate_hey_pro",
            "payload": {"estimated_cashback": round(cashback, 2)},
        })
        return {"text": text, "actions": actions}

    # ── Default: contextual pero no genérico ─────────────────
    parts = []
    if zona:
        parts.append(f"Tus finanzas están en zona **{zona}**")
    if top_cat:
        parts.append(f"tu mayor gasto es en **{top_cat}**")
    if recs:
        cashback = recs[0].get("cashback_perdido_mes", 0)
        if cashback > 50:
            parts.append(f"podrías ganar **${cashback:,.0f}/mes** en cashback con Hey Pro")

    intro = (". ".join(parts) + ". ") if parts else ""
    text = intro + "Estoy aquí para ayudarte — puedo analizar tus gastos, revisar alertas o buscar oportunidades de ahorro. ¿Qué quieres explorar?"

    if ml_alerta:
        actions.append({
            "label": "Ver mi situación",
            "action_id": "view_financial_forecast",
            "payload": {},
        })
    return {"text": text, "actions": actions}


def build_prompt_with_context(user_message: str, context: dict) -> str:
    context_str = json.dumps(context, indent=2, ensure_ascii=False)
    return f"""
--- CONTEXTO DEL USUARIO ---
{context_str}
---------------------------

Mensaje del usuario: "{user_message}"

RESPONDE ÚNICAMENTE EN FORMATO JSON como se indicó en las instrucciones del sistema.
"""


def generate_havi_response(
    user_id: str,
    context: dict,
    user_message: str,
    model_name: str = "gemini-2.5-flash-lite",
) -> dict:
    """
    Genera la respuesta de Havi.
    1. Intenta Gemini con contexto trimado.
    2. Si Gemini falla, devuelve respuesta contextual basada en reglas (no genérica).
    """
    trimmed = _trim_context(context)
    prompt = build_prompt_with_context(user_message, trimmed)

    t0 = time.perf_counter()
    try:
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=HAVI_SYSTEM_PROMPT,
                temperature=0.3,
                response_mime_type="application/json",
            ),
        )
        elapsed = time.perf_counter() - t0
        print(f"[Gemini] OK {model_name} — {elapsed:.2f}s | user={user_id}")

        try:
            data = json.loads(response.text)
            return {
                "text": data.get("text", ""),
                "actions": data.get("actions", []),
            }
        except Exception:
            return {"text": response.text, "actions": []}

    except Exception as e:
        elapsed = time.perf_counter() - t0
        err_str = str(e)
        print(f"[Gemini] ERROR {model_name} — {elapsed:.2f}s | {err_str[:120]}")

        # Si la key expiró o es inválida, indícalo con log claro
        if "API_KEY_INVALID" in err_str or "API key expired" in err_str or "INVALID_ARGUMENT" in err_str:
            print("[Gemini] ⚠️  API key inválida o expirada. Usando respuesta contextual de fallback.")

        # Devuelve respuesta contextual real usando el contexto UC1-UC4
        return _build_fallback_response(context, user_message)
