"""UC2 — Gemelo Digital / Alerta de Liquidez.

Functions:
    build_context_uc2(user_id, dfs) -> dict
    setCategoryBudgetLimit(user_id, categoria, limite_mxn) -> dict
    get_uc2_candidates(dfs) -> pd.DataFrame
"""
import pandas as pd

TOP_CATEGORIAS_DISCRECIONALES = [
    "restaurante", "entretenimiento", "viajes", "supermercado",
    "tecnologia", "hogar", "ropa", "salud",
]


def get_uc2_candidates(dfs: dict) -> pd.DataFrame:
    """Return users with non-Saludable risk zone, sorted by score descending."""
    df = dfs["score_riesgo"].copy()
    df_proy = dfs["proyeccion"]
    df_cli = dfs["clientes"][["user_id"]].copy()

    df = df.merge(df_proy[["user_id", "gasto_acumulado_mes", "gasto_estimado_fin_mes",
                             "carga_fija_total", "dias_hasta_deficit"]], on="user_id", how="left",
                  suffixes=("", "_proy"))

    interesting = df[df["zona_riesgo"] != "Saludable"].copy()
    if interesting.empty:
        # Fall back to highest risk scores
        interesting = df.nlargest(50, "score_riesgo")
    interesting["label"] = interesting.apply(
        lambda r: f"{r['user_id']} — {r['zona_riesgo']} (score {r['score_riesgo']:.2f})", axis=1
    )
    return interesting.sort_values("score_riesgo", ascending=False)


def build_context_uc2(user_id: str, dfs: dict) -> dict:
    """Build Havi context payload for UC2 (liquidity alert / digital twin)."""
    df_score = dfs["score_riesgo"]
    df_proy = dfs["proyeccion"]
    df_cli = dfs["clientes"]
    df_tx = dfs["transacciones"]

    score_row = df_score[df_score["user_id"] == user_id]
    proy_row = df_proy[df_proy["user_id"] == user_id]
    cli_row = df_cli[df_cli["user_id"] == user_id]

    if score_row.empty:
        raise ValueError(f"No risk score found for {user_id}")

    s = score_row.iloc[0]
    p = proy_row.iloc[0] if not proy_row.empty else pd.Series(dtype=object)
    c = cli_row.iloc[0] if not cli_row.empty else pd.Series(dtype=object)

    # Determine top spending category from transactions
    tx_user = df_tx[
        (df_tx["user_id"] == user_id)
        & (df_tx["tipo_operacion"] == "compra")
        & (df_tx["estatus"] == "completada")
    ]
    categoria_problema = "servicios_digitales"
    if not tx_user.empty:
        cats = tx_user.groupby("categoria_mcc")["monto"].sum()
        discrecional = cats[cats.index.isin(TOP_CATEGORIAS_DISCRECIONALES)]
        if not discrecional.empty:
            categoria_problema = discrecional.idxmax()

    gasto_acum = float(p.get("gasto_acumulado_mes", 0)) if not p.empty else 0.0
    gasto_est = float(p.get("gasto_estimado_fin_mes", 0)) if not p.empty else 0.0
    ingreso = float(c.get("ingreso_mensual_mxn", s.get("ingreso_mensual_mxn", 0))) if not c.empty else float(s.get("ingreso_mensual_mxn", 0))
    carga_fija = float(s.get("carga_fija_total", 0))
    deficit_proyectado = float(s.get("ingreso_restante_estimado", ingreso - gasto_est - carga_fija))

    from datetime import date
    today = date.today()
    import calendar
    last_day = calendar.monthrange(today.year, today.month)[1]
    dias_al_corte = last_day - today.day

    return {
        "user_id": user_id,
        "nombre_usuario": f"cliente {user_id}",
        "zona_riesgo": str(s.get("zona_riesgo", "Saludable")),
        "score_riesgo": round(float(s.get("score_riesgo", 0)), 4),
        "tendencia_riesgo": str(s.get("tendencia_riesgo", "Estable")),
        "delta_score_mensual": round(float(s.get("delta_score_mensual", 0)), 4),
        "gasto_acumulado_mes": round(gasto_acum, 2),
        "gasto_estimado_fin_mes": round(gasto_est, 2),
        "mensualidades_pendientes": round(carga_fija, 2),
        "ingreso_mensual": round(ingreso, 2),
        "deficit_proyectado": round(deficit_proyectado, 2),
        "dias_al_corte": dias_al_corte,
        "categoria_problema": categoria_problema,
        "comparativa_mes_anterior": {
            "gasto_real_mes_anterior": round(float(s.get("gasto_real_mes_anterior", 0) if hasattr(s, "get") else 0), 2),
            "gasto_estimado_fin_mes": round(gasto_est, 2),
        },
    }


def setCategoryBudgetLimit(user_id: str, categoria: str, limite_mxn: float) -> dict:
    """Mock tool: set a monthly spending limit for a category."""
    if limite_mxn <= 0:
        return {
            "success": False,
            "message": "El límite debe ser mayor a $0 MXN",
            "limite_configurado": None,
            "alerta_pct": None,
            "error_code": "LIMITE_INVALIDO",
        }
    return {
        "success": True,
        "message": f"Límite de ${limite_mxn:,.0f} MXN/mes configurado para '{categoria}'. Te avisaré cuando llegues al 80%.",
        "limite_configurado": limite_mxn,
        "alerta_pct": 80,
        "user_id": user_id,
        "categoria": categoria,
        "error_code": None,
    }
