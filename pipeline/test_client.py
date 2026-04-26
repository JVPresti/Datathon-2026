"""
test_client.py — Pruebas de integración del pipeline de Havi con datos reales.

Cubre casos representativos de la base de Hey Banco:
  - USR-00001: usuario con rechazo por saldo insuficiente en servicios digitales
  - USR-00002: usuario con rechazo en restaurante, sin inversión
  - USR-00003: usuario con rechazo grande (transf_salida $14,750)
  - USR-00004: candidato Hey Pro (cashback perdido + score alto)
  - Usuario genérico sin alertas: pregunta abierta de bienvenida

También prueba el endpoint /context/full para inspeccionar el contexto ensamblado.
"""

import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"


def separator(title: str):
    print(f"\n{'='*55}")
    print(f"  {title}")
    print(f"{'='*55}")


def test_health():
    separator("HEALTH CHECK")
    try:
        r = requests.get(f"{BASE_URL}/health", timeout=5)
        print(f"Status: {r.status_code}")
        print(r.json())
    except Exception as e:
        print(f"❌ Error: {e}")
        print("   Asegúrate de que el servidor esté corriendo:")
        print("   cd pipeline && uvicorn main:app --reload")
        return False
    return True


def test_context(user_id: str):
    """Muestra el contexto real ensamblado para debug."""
    separator(f"CONTEXTO REAL → {user_id}")
    r = requests.get(f"{BASE_URL}/context/full/{user_id}", timeout=10)
    if r.status_code == 200:
        ctx = r.json()["havi_context"]
        up  = ctx["user_profile"]
        print(f"  Persona UC2:       {ctx['uc2']['persona']}")
        print(f"  Key traits:        {ctx['uc2']['key_traits']}")
        print(f"  Es Hey Pro:        {up['es_hey_pro']}")
        print(f"  Productos activos: {[p['tipo'] for p in up['productos_activos']]}")
        print(f"  Alertas UC1:       {len(ctx['uc1']['alerts'])} alerta(s)")
        for a in ctx["uc1"]["alerts"]:
            print(f"    → {a['alert_type']} | prioridad: {a['priority']} | monto: ${a['context'].get('monto',0):,.2f}")
        print(f"  Recomendaciones:   {len(ctx['uc3']['recommendations'])}")
        for rec in ctx["uc3"]["recommendations"]:
            print(f"    → {rec['producto']} | score: {rec['score']} | cashback: ${rec.get('cashback_perdido_mes',0):.2f}/mes")
        print(f"  UC4 intent_top:    {ctx['uc4']['intent_top']}")
        print(f"  Menciona fraude:   {ctx['uc4']['menciona_fraude']}")
        print(f"  Turnos recientes:  {len(ctx['uc4']['recent_turns'])}")
    elif r.status_code == 404:
        print(f"  ⚠️  Usuario no encontrado: {r.json()['detail']}")
    else:
        print(f"  ❌ Error {r.status_code}: {r.text}")
    print()


def test_chat(user_id: str, message: str, label: str = ""):
    if label:
        separator(f"CHAT — {label}")
    print(f"  Usuario : {user_id}")
    print(f"  Mensaje : \"{message}\"")

    start = time.time()
    try:
        r = requests.post(
            f"{BASE_URL}/chat",
            json={"user_id": user_id, "message": message},
            timeout=60,
        )
        elapsed = time.time() - start
        print(f"  Status  : {r.status_code} ({elapsed:.2f}s)")

        if r.status_code == 200:
            data = r.json()
            res = data.get("response", "")
            actions = data.get("actions", [])
            context = data.get("context_used", {})

            print("\n  [DEBUG] Contexto enviado a Gemini:")
            print("  " + "=" * 50)
            print(json.dumps(context, indent=4, ensure_ascii=False))
            print("  " + "=" * 50)

            print("\n  Respuesta de Havi:")
            print("  " + "-" * 50)
            for line in res.splitlines():
                print(f"  {line}")
            
            if actions:
                print("\n  Acciones sugeridas para el Front-end:")
                for act in actions:
                    print(f"  [ {act['label']} ] -> {act['action_id']}")
            
            print("  " + "-" * 50)
        elif r.status_code == 404:
            print(f"  ⚠️  {r.json()['detail']}")
        else:
            print(f"  ❌ Error: {r.text[:300]}")
    except Exception as e:
        print(f"  ❌ Excepción: {e}")
    print()


if __name__ == "__main__":
    # ── 1. Health check ────────────────────────────────────────────────────
    if not test_health():
        exit(1)

    # ── CASE 1: [UC1] Copilot Proactivo (Rechazos) ─────────────────────────
    # Usuario USR-00001 tiene un rechazo real por saldo insuficiente.
    test_context("USR-00001")
    test_chat(
        user_id  = "USR-00001",
        message  = "Hola, acabo de intentar pagar mi Netflix y me rechazaron. ¿Qué pasó?",
        label    = "UC1 — Rechazo por Saldo Insuficiente",
    )

    # ── CASE 2: [UC2] Gemelo Digital (Liquidez y Predicción) ───────────────
    # Usuario USR-00003 tiene compromisos altos y riesgo de liquidez moderado.
    test_chat(
        user_id  = "USR-00003",
        message  = "Havi, ¿cómo voy para terminar el mes? Siento que he gastado mucho.",
        label    = "UC2 — Simulación de Salud Financiera",
    )

    # ── CASE 3: [UC3] Upselling Empático (Hey Pro) ────────────────────────
    # Usuario USR-00004 es candidato ideal a Hey Pro (gana mucho cashback no aprovechado).
    test_chat(
        user_id  = "USR-00004",
        message  = "¿Cómo puedo sacarle más provecho a mi cuenta de Hey?",
        label    = "UC3 — Recomendación de Hey Pro",
    )

    # ── CASE 4: [UC4] Seguridad Inteligente (Anomalía) ─────────────────────
    # Usuario USR-00002 tiene alertas de fraude y transacciones marcadas como atípicas.
    test_chat(
        user_id  = "USR-00002",
        message  = "Vi un cargo extraño en mi cuenta que no reconozco.",
        label    = "UC4 — Detección de Anomalía / Fraude",
    )

    print("\n✅ Todas las pruebas de Casos de Uso completadas.")
