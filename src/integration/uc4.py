"""UC4 — Seguridad / Anomaly Detection & Response Bifurcation.

Functions:
    build_context_uc4(txn_id, user_id, dfs) -> dict
    approveFlaggedTransaction(txn_id) -> dict
    blockCardAndRevert(txn_id, producto_id) -> dict
    get_uc4_candidates(dfs) -> pd.DataFrame
    format_havi_message(ctx, canal) -> str
"""
import re
import pandas as pd
from datetime import datetime

REGEX_SI = re.compile(r"(?i)\b(s[ií]|yo|fui\s+yo|reconozco|confirmo|claro|aprobada|correcto)\b")
REGEX_NO = re.compile(r"(?i)\b(no\s+fui|no\s+reconozco|no\s+soy|nadie|fraude|robo|alguien\s+(m[aá]s|hacke)|disputa)\b")

TIMEOUT_MINUTOS = 10
SLA_SI_SEG = 5
SLA_NO_SEG = 10


def get_uc4_candidates(dfs: dict) -> pd.DataFrame:
    """Return transactions flagged as anomalous by the model/rules."""
    df_tx = dfs["transacciones"]
    anomalas = df_tx[
        (df_tx["patron_uso_atipico"] == True)
        & (df_tx["estatus"] == "completada")
        & (df_tx["monto"] >= 1000)
    ].copy()
    anomalas = anomalas.sort_values("monto", ascending=False).head(300)
    anomalas["label"] = anomalas.apply(
        lambda r: f"{r['transaccion_id']} — ${r['monto']:,.0f} en {r['ciudad_transaccion']} {'🌍' if r['es_internacional'] else ''}",
        axis=1,
    )
    return anomalas


def build_context_uc4(txn_id: str, user_id: str, dfs: dict, canal: str = "chat") -> dict:
    """Build minimal Havi context payload for UC4 (fraud alert)."""
    df_tx = dfs["transacciones"]
    df_prod = dfs["productos"]

    txn_rows = df_tx[df_tx["transaccion_id"] == txn_id]
    if txn_rows.empty:
        raise ValueError(f"Transaction {txn_id} not found")
    txn = txn_rows.iloc[0]

    prod_rows = df_prod[
        (df_prod["user_id"] == user_id)
        & (df_prod["producto_id"] == txn.get("producto_id", ""))
    ]
    producto_id = str(txn["producto_id"]) if pd.notna(txn.get("producto_id")) else "PRD-UNKNOWN"

    hora = int(txn["hora_del_dia"]) if pd.notna(txn.get("hora_del_dia")) else 12
    es_nocturna = hora >= 22 or hora <= 5

    # Anomaly score: use 7 as rule-based max (from existing model output) if atipico=True
    anomaly_score = 7.0 if txn.get("patron_uso_atipico") else 1.0

    return {
        "user_id": user_id,
        "transaccion_id": txn_id,
        "producto_id": producto_id,
        "monto": float(txn["monto"]),
        "comercio": str(txn["comercio_nombre"]) if pd.notna(txn.get("comercio_nombre")) else str(txn["categoria_mcc"]),
        "ciudad_transaccion": str(txn["ciudad_transaccion"]) if pd.notna(txn.get("ciudad_transaccion")) else "N/A",
        "fecha_hora": str(txn["fecha_hora"]),
        "hora_del_dia": hora,
        "es_internacional": bool(txn["es_internacional"]),
        "es_nocturna": es_nocturna,
        "anomaly_score": anomaly_score,
        "canal_alerta": canal,
        "sla_respuesta_seg": SLA_SI_SEG,
    }


def format_havi_message(ctx: dict, canal: str = "chat") -> str:
    """Format Havi's alert message differently for chat vs voice channel."""
    monto = ctx["monto"]
    comercio = ctx["comercio"]
    ciudad = ctx["ciudad_transaccion"]
    hora = ctx["hora_del_dia"]
    es_intl = ctx["es_internacional"]

    intl_tag = " (internacional 🌍)" if es_intl else ""

    if canal == "voz":
        return (
            f"Alerta: cargo de ${monto:,.0f} pesos en {comercio}{intl_tag}. "
            f"¿Lo reconoces? Di sí o no."
        )
    else:
        hora_str = f"{hora:02d}:00"
        return (
            f"⚠️ Detecté un cargo de **${monto:,.2f} MXN** en {comercio}, "
            f"{ciudad}{intl_tag} a las {hora_str}. "
            f"¿Tú lo hiciste? Responde **Sí** o **No**."
        )


def classify_response(user_input: str) -> str:
    """Classify user response into si_fui_yo, no_fui_yo, or sin_respuesta."""
    if not user_input or not user_input.strip():
        return "sin_respuesta"
    txt = user_input.strip()
    if REGEX_NO.search(txt):
        return "no_fui_yo"
    if REGEX_SI.search(txt):
        return "si_fui_yo"
    return "sin_respuesta"


def approveFlaggedTransaction(txn_id: str) -> dict:
    """Mock tool: approve and release a flagged transaction."""
    return {
        "success": True,
        "txn_id": txn_id,
        "estatus_resultante": "completada",
        "sla_objetivo_seg": SLA_SI_SEG,
        "message": "✅ Transacción liberada y completada exitosamente.",
        "telemetria": {
            "evento": "true_negative_anomalia",
            "accion": "refuerzo_negativo_al_modelo",
        },
    }


def blockCardAndRevert(txn_id: str, producto_id: str) -> dict:
    """Mock tool: block card and revert a fraudulent transaction."""
    disputa_id = f"DSP-{txn_id[-8:]}-{datetime.now().strftime('%Y%m%d')}"
    return {
        "success": True,
        "txn_id": txn_id,
        "producto_id": producto_id,
        "estatus_txn": "revertida",
        "estatus_producto": "bloqueado",
        "disputa_id": disputa_id,
        "entrega_nueva_tarjeta_dias": 2,
        "sla_objetivo_seg": SLA_NO_SEG,
        "message": (
            f"🔒 Tarjeta bloqueada y cargo revertido. "
            f"Disputa abierta: {disputa_id}. "
            f"Recibirás una nueva tarjeta en máx. 48h."
        ),
    }
