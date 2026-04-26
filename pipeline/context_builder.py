"""
context_builder.py — Construye el contexto consolidado UC1-UC4 para un user_id dado,
consultando los DataFrames ya cargados en memoria (data_loader.DL).

Sigue la arquitectura definida en ARQUITECTURA_PIPELINE.md:
  - UC1: alertas de transacciones rechazadas / atípicas (event-driven)
  - UC2: perfil del gemelo digital (persona financiera + métricas)
  - UC3: recomendaciones de upselling (score de propensión)
  - UC4: historial conversacional + señales de intención
"""

from __future__ import annotations

import math
from typing import Optional
import pandas as pd
from data_loader import DL
from models_inference import ML


def _safe_float(v, default=None):
    """Convierte v a float seguro para JSON: reemplaza inf/nan por default (None o 0)."""
    try:
        f = float(v)
        if math.isfinite(f):
            return round(f, 2)
        return default
    except (TypeError, ValueError):
        return default


def _safe_int(v, default=0) -> int:
    """Convierte v a int seguro, ignorando NaN/None."""
    try:
        f = float(v)
        if math.isfinite(f):
            return int(f)
        return default
    except (TypeError, ValueError):
        return default

# Prioridad de alertas UC1 por motivo
_PRIORIDAD = {
    "saldo_insuficiente": "alta",
    "limite_excedido": "alta",
    "tarjeta_bloqueada": "critica",
    "fraude_detectado": "critica",
}

# Personas UC2 derivadas de las features del gemelo digital (mapeadas por clustering)
def _derivar_persona(uc2_row: Optional[dict]) -> str:
    """Heurística para asignar una persona financiera a partir de las features UC2."""
    if not uc2_row:
        return "Perfil desconocido"
    es_pro      = uc2_row.get("feat_eng_es_hey_pro", False)
    nomina      = uc2_row.get("feat_eng_nomina_domiciliada", False)
    tiene_inv   = uc2_row.get("feat_port_has_inversion_hey", False)
    n_creditos  = uc2_row.get("feat_port_n_creditos_activos", 0) or 0
    recency     = uc2_row.get("feat_txn_recency_dias", 999) or 999
    score_buro  = uc2_row.get("feat_dem_score_buro", 600) or 600
    ingreso_log = uc2_row.get("feat_dem_ingreso_log", 10) or 10
    remesas     = uc2_row.get("feat_eng_recibe_remesas", False)

    if recency > 60:
        return "Inactivo / dormido"
    if remesas:
        return "Receptor de remesas"
    if es_pro and tiene_inv and n_creditos == 0:
        return "Hey Pro power user"
    if nomina and ingreso_log >= 10.5 and n_creditos <= 1:
        return "Familiar planificado"
    if n_creditos >= 2 and score_buro < 600:
        return "Apretado por crédito"
    if uc2_row.get("feat_port_has_cuenta_negocios", False):
        return "Empresario / negocios"
    if not es_pro and ingreso_log < 10.2:
        return "Joven explorador"
    if tiene_inv and not es_pro:
        return "Conservador con colchón"
    return "Familiar planificado"


def _derivar_key_traits(uc2_row: Optional[dict], cli_row: Optional[dict]) -> list[str]:
    traits = []
    if not uc2_row:
        return ["nuevo_usuario"]
    if uc2_row.get("feat_eng_es_hey_pro"):
        traits.append("hey_pro_activo")
    if uc2_row.get("feat_eng_nomina_domiciliada"):
        traits.append("nomina_domiciliada")
    if uc2_row.get("feat_port_has_inversion_hey"):
        traits.append("tiene_inversion_hey")
    top_cat = uc2_row.get("feat_mcc_top_categoria")
    if top_cat and str(top_cat) not in ["nan", "None", "transferencia"]:
        traits.append(f"gasto_top_{top_cat}")
    if (uc2_row.get("feat_dem_score_buro") or 0) >= 700:
        traits.append("score_buro_bueno")
    if uc2_row.get("feat_time_weekend_ratio", 0) > 0.45:
        traits.append("gasta_fines_de_semana")
    return traits[:5] if traits else ["usuario_activo"]


def build_context(user_id: str) -> dict:
    """
    Retorna el contexto ensamblado de UC1–UC4 para un user_id real.
    Si el usuario no existe en alguna fuente, usa valores seguros por defecto.
    """

    # ── Perfil base del cliente ────────────────────────────────────────────
    cli = DL.clientes_idx.get(user_id, {})
    uc2_row  = DL.uc2_idx.get(user_id)
    risk_row = DL.uc1_risk_idx.get(user_id)
    uc4_row  = DL.uc4_idx.get(user_id)
    score_row = DL.score_idx.get(user_id)

    # Productos activos del usuario
    prods_df = DL.prods_by_user.get(user_id, pd.DataFrame())
    prods_activos = []
    if not prods_df.empty:
        activos = prods_df[prods_df["estatus"] == "activo"]
        for _, p in activos.iterrows():
            prods_activos.append({
                "tipo": p["tipo_producto"],
                "saldo": round(float(p["saldo_actual"]) if pd.notna(p["saldo_actual"]) else 0, 2)
            })

    # ── UC1: Alertas de riesgo ─────────────────────────────────────────────
    # Tomamos los rechazos recientes de este usuario del feat_uc1_alertas
    alertas_list = []
    user_alertas = DL.uc1_alertas[
        (DL.uc1_alertas["user_id"] == user_id) &
        (DL.uc1_alertas["estatus"] == "no_procesada")
    ].sort_values("fecha_hora", ascending=False).head(3)

    for _, row in user_alertas.iterrows():
        motivo = str(row.get("motivo_no_procesada", "")) if pd.notna(row.get("motivo_no_procesada")) else ""
        alert_type = "rechazo_" + motivo.replace("_", " ").split()[0] if motivo else "transaccion_atipica"

        # Saldo alternativo de inversión
        inv_row = prods_df[
            (prods_df["tipo_producto"] == "inversion_hey") &
            (prods_df["estatus"] == "activo")
        ]
        saldo_inv = float(inv_row["saldo_actual"].values[0]) if not inv_row.empty else 0.0

        context_alerta = {
            "transaccion_id": row["transaccion_id"],
            "fecha_hora": row["fecha_hora"].isoformat() if pd.notna(row["fecha_hora"]) else "",
            "monto": round(float(row["monto"]), 2),
            "motivo": motivo,
            "categoria": str(row.get("categoria_mcc", "")),
            "es_nocturna": bool(row.get("feat_es_nocturna", False)),
            "es_internacional": bool(row.get("feat_es_internacional", False)),
            "saldo_inversion_disponible": round(saldo_inv, 2),
        }

        alertas_list.append({
            "alert_type": alert_type,
            "priority": _PRIORIDAD.get(motivo, "media"),
            "context": context_alerta,
        })

    # Alertas por transacciones atípicas (patron_uso_atipico)
    user_atipicas = DL.uc1_alertas[
        (DL.uc1_alertas["user_id"] == user_id) &
        (DL.uc1_alertas["patron_uso_atipico_txn"] == True)
    ].sort_values("fecha_hora", ascending=False).head(1)

    for _, row in user_atipicas.iterrows():
        alertas_list.append({
            "alert_type": "transaccion_atipica",
            "priority": "critica" if bool(row.get("feat_intl_x_nocturna", False)) else "alta",
            "context": {
                "transaccion_id": row["transaccion_id"],
                "monto": round(float(row["monto"]), 2),
                "categoria": str(row.get("categoria_mcc", "")),
                "es_nocturna": bool(row.get("feat_es_nocturna", False)),
                "es_internacional": bool(row.get("feat_es_internacional", False)),
            }
        })

    # ── UC2: Gemelo digital ─────────────────────────────────────────────────
    persona    = _derivar_persona(uc2_row)
    key_traits = _derivar_key_traits(uc2_row, cli)

    metricas_uc2 = {}
    if uc2_row:
        metricas_uc2 = {
            "n_tx_30d":           _safe_int(uc2_row.get("feat_txn_n_tx_30d", 0)),
            "n_tx_90d":           _safe_int(uc2_row.get("feat_txn_n_tx_90d", 0)),
            "gasto_total":        _safe_float(uc2_row.get("feat_txn_gasto_total", 0), 0),
            "ticket_avg":         _safe_float(uc2_row.get("feat_txn_ticket_avg", 0), 0),
            "top_categoria":      str(uc2_row.get("feat_mcc_top_categoria", "") or ""),
            "score_buro":         _safe_int(uc2_row.get("feat_dem_score_buro", 0)),
            "n_productos_activos":_safe_int(uc2_row.get("feat_port_n_productos_activos", 0)),
            "weekend_ratio":      _safe_float(uc2_row.get("feat_time_weekend_ratio", 0), 0),
        }

    # Liquidez UC2 (de score_riesgo) — dias_hasta_deficit puede ser inf cuando no hay riesgo
    if score_row:
        dias = _safe_float(score_row.get("dias_hasta_deficit"), default=None)  # None = sin riesgo de déficit
        metricas_uc2["zona_riesgo"]               = str(score_row.get("zona_riesgo", ""))
        metricas_uc2["dias_hasta_deficit"]        = dias  # None = finanzas saludables, sin horizonte de déficit
        metricas_uc2["ingreso_restante_estimado"] = _safe_float(score_row.get("ingreso_restante_estimado", 0), 0)
        metricas_uc2["tendencia_riesgo"]          = str(score_row.get("tendencia_riesgo", ""))

    # ── ML: Predicción de riesgo de liquidez con Random Forest (UC2) ──────────
    if ML.loaded and uc2_row and score_row:
        liquidez_ml = ML.predict_liquidez(uc2_row=uc2_row, score_row=score_row)
        metricas_uc2["ml_prob_deficit"]       = liquidez_ml.get("prob_deficit")
        metricas_uc2["ml_alerta_liquidez"]    = liquidez_ml.get("alerta_liquidez", False)
        metricas_uc2["ml_nivel_riesgo"]       = liquidez_ml.get("nivel_riesgo", "bajo")
        metricas_uc2["ml_ingreso_comprometido_pct"] = liquidez_ml.get("ingreso_comprometido_pct")

    # ── ML: IsoForest — score de anomalía de la última transacción del usuario ──
    # Calculado una sola vez y usado tanto en UC1 (urgencia de alerta) como en UC4
    # (contexto conversacional), siguiendo la arquitectura: el IsoForest vive en UC4
    # para detectar cuándo el usuario habla de un cargo sospechoso.
    iso_result = {"iso_anomaly_score": None, "iso_is_anomaly": False}
    if ML.loaded:
        txn_rows = DL.txn_profile_idx.get(user_id, [])
        if txn_rows:
            iso_result = ML.score_transaccion(txn_rows[-1])

    # UC1: enriquecer cada alerta con el score de anomalía
    for alerta in alertas_list:
        alerta["iso_anomaly_score"] = iso_result.get("iso_anomaly_score")
        alerta["iso_is_anomaly"]    = iso_result.get("iso_is_anomaly", False)

    # ── UC3: Recomendaciones ─────────────────────────────────────────────────
    user_recs = DL.uc3_candidates[DL.uc3_candidates["user_id"] == user_id]
    recs_list = []
    for _, r in user_recs.sort_values("score_propension", ascending=False).head(3).iterrows():
        cashback_perdido = float(r.get("cashback_perdido_mes", 0) or 0)
        recs_list.append({
            "producto": str(r["producto_candidato"]),
            "score": round(float(r["score_propension"]), 1),
            "reason": _build_rec_reason(r, cashback_perdido),
            "cashback_perdido_mes": round(cashback_perdido, 2),
        })

    # ── UC4: Historial conversacional ────────────────────────────────────────
    # Últimos 6 turnos de conversación real
    user_convs = DL.convs[DL.convs["user_id"] == user_id].sort_values("date", ascending=False).head(6)
    recent_turns = []
    for _, row in user_convs.iterrows():
        if str(row.get("input", "")).strip():
            recent_turns.append({"role": "user",      "content": str(row["input"])[:200],  "ts": row["date"].isoformat()})
        if str(row.get("output", "")).strip():
            recent_turns.append({"role": "assistant", "content": str(row["output"])[:200], "ts": row["date"].isoformat()})
    recent_turns = recent_turns[:6]  # max 6 mensajes

    intent_top         = str(uc4_row.get("feat_conv_intent_top", "general") or "general") if uc4_row else "general"
    menciona_fraude    = bool(uc4_row.get("feat_conv_menciona_fraude",   False)) if uc4_row else False
    menciona_cashback  = bool(uc4_row.get("feat_conv_menciona_cashback", False)) if uc4_row else False
    menciona_credito   = bool(uc4_row.get("feat_conv_menciona_credito",  False)) if uc4_row else False
    menciona_inversion = bool(uc4_row.get("feat_conv_menciona_inversion",False)) if uc4_row else False

    # UC4: señal de anomalía transaccional (IsoForest) para graduar la respuesta
    # de Havi cuando el usuario menciona un cargo que no reconoce.
    # Si iso_is_anomaly=True Y menciona_fraude=True → Havi debe escalar urgencia.
    iso_txn_anomaly_score = iso_result.get("iso_anomaly_score")
    iso_txn_is_anomaly    = iso_result.get("iso_is_anomaly", False)
    # Combinar señal ML con señal conversacional
    alerta_fraude_alta = iso_txn_is_anomaly and menciona_fraude

    # ── Ensamblado final ─────────────────────────────────────────────────────
    return {
        "user_profile": {
            "es_hey_pro":          bool(cli.get("es_hey_pro", False)),
            "edad":                _safe_int(cli.get("edad", 0)),
            "estado":              str(cli.get("estado", "") or ""),
            "ingreso_mensual_mxn": _safe_int(cli.get("ingreso_mensual_mxn", 0)),
            "satisfaccion_1_10":   _safe_float(cli.get("satisfaccion_1_10", 7), 7),
            "preferencia_canal":   str(cli.get("preferencia_canal", "") or ""),
            "n_rechazos_30d":      _safe_int(risk_row.get("feat_n_rechazos_30d", 0)) if risk_row else 0,
            "n_disputas":          _safe_int(risk_row.get("feat_n_disputas", 0)) if risk_row else 0,
            "es_cronico_rechazos": bool(risk_row.get("feat_es_cronico_uc1", False)) if risk_row else False,
            "productos_activos":   prods_activos,
        },
        "uc1": {
            "alerts": alertas_list
        },
        "uc2": {
            "persona":    persona,
            "key_traits": key_traits,
            "metrics":    metricas_uc2,
        },
        "uc3": {
            "recommendations": recs_list
        },
        "uc4": {
            "recent_turns":       recent_turns,
            "intent_top":         intent_top,
            "menciona_fraude":    menciona_fraude,
            "menciona_cashback":  menciona_cashback,
            "menciona_credito":   menciona_credito,
            "menciona_inversion": menciona_inversion,
            # Señal IsoForest en UC4: para escalar urgencia si el usuario habla de un cargo sospechoso
            "iso_txn_anomaly_score": iso_txn_anomaly_score,
            "iso_txn_is_anomaly":    iso_txn_is_anomaly,
            "alerta_fraude_alta":    alerta_fraude_alta,  # iso_is_anomaly AND menciona_fraude
        }
    }


def _build_rec_reason(row, cashback_perdido: float) -> str:
    producto = str(row.get("producto_candidato", ""))
    nomina   = bool(row.get("nomina_domiciliada", False))
    mencion  = int(row.get("menciona_producto", 0) or 0)

    if producto == "hey_pro":
        base = f"Pierde ${cashback_perdido:.0f}/mes en cashback sin Hey Pro."
        if nomina:
            base += " Tiene nómina domiciliada."
        if mencion > 0:
            base += f" Ha mencionado el producto {mencion} vez(ces) en Havi."
        return base
    elif "credito" in producto:
        score = int(row.get("score_buro", 0) or 0)
        ingreso = int(row.get("ingreso_mensual_mxn", 0) or 0)
        return f"Score buró: {score}. Ingreso mensual: ${ingreso:,}. Candidato elegible para {producto}."
    else:
        return f"Candidato a {producto} con score de propensión {float(row.get('score_propension', 0)):.1f}."
