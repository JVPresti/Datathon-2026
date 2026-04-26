"""UC3 — Upselling Inteligente (Hey Pro).

Functions:
    build_context_uc3(user_id, dfs) -> dict
    initiatePayrollPortability(user_id) -> dict
    get_uc3_candidates(dfs) -> pd.DataFrame
"""
import pandas as pd

UMBRAL_SEGMENTO_A = 300.0
UMBRAL_SEGMENTO_B = 100.0
COOLDOWN_NO_DIAS = 30


def _segmento(cashback_mes: float) -> str:
    if cashback_mes >= UMBRAL_SEGMENTO_A:
        return "A"
    elif cashback_mes >= UMBRAL_SEGMENTO_B:
        return "B"
    return "C"


def get_uc3_candidates(dfs: dict) -> pd.DataFrame:
    """Return non-Pro users with meaningful cashback loss (segments A and B)."""
    df_cb = dfs["cashback_perdido"].copy()
    df_cli = dfs["clientes"]

    df = df_cb.merge(df_cli[["user_id", "nomina_domiciliada", "dias_desde_ultimo_login"]], on="user_id", how="left")
    df["segmento"] = df["cashback_perdido_mes"].apply(_segmento)
    interesting = df[df["segmento"].isin(["A", "B"])].sort_values("cashback_perdido_mes", ascending=False)
    interesting["label"] = interesting.apply(
        lambda r: f"{r['user_id']} — Seg {r['segmento']} — perdió ${r['cashback_perdido_mes']:.0f}/mes ({r['top_categoria_perdida']})",
        axis=1,
    )
    return interesting


def build_context_uc3(user_id: str, dfs: dict) -> dict:
    """Build Havi context payload for UC3 (Hey Pro upselling)."""
    df_cb = dfs["cashback_perdido"]
    df_cli = dfs["clientes"]

    cb_row = df_cb[df_cb["user_id"] == user_id]
    cli_row = df_cli[df_cli["user_id"] == user_id]

    if cb_row.empty:
        raise ValueError(f"No cashback data found for {user_id}")

    cb = cb_row.iloc[0]
    c = cli_row.iloc[0] if not cli_row.empty else pd.Series(dtype=object)

    cashback_mes = float(cb["cashback_perdido_mes"])
    ya_tiene_nomina = bool(c.get("nomina_domiciliada", False)) if not c.empty else False
    pasos = 1 if ya_tiene_nomina else 3
    segmento = _segmento(cashback_mes)
    dias_login = int(c.get("dias_desde_ultimo_login", 7)) if not c.empty else 7

    score_propension = min(1.0, cashback_mes / UMBRAL_SEGMENTO_A)

    return {
        "user_id": user_id,
        "nombre_usuario": f"cliente {user_id}",
        "cashback_perdido_mes": round(cashback_mes, 2),
        "cashback_anual_estimado": round(cashback_mes * 12, 2),
        "top_categoria_perdida": str(cb["top_categoria_perdida"]),
        "monto_top_categoria": round(float(cb["monto_top_categoria"]), 2),
        "segmento": segmento,
        "ya_tiene_nomina": ya_tiene_nomina,
        "pasos_activacion": pasos,
        "requisito_activacion": "Activar Hey Pro directamente" if ya_tiene_nomina else "Domiciliar nómina en Hey, luego activar Hey Pro",
        "score_propension": round(score_propension, 4),
        "dias_desde_ultimo_login": dias_login,
    }


def initiatePayrollPortability(user_id: str) -> dict:
    """Mock tool: initiate payroll portability to Hey Banco."""
    clabe = f"646180000000{user_id[-5:].replace('-', '').zfill(5)}"
    return {
        "success": True,
        "estado": "iniciado",
        "user_id": user_id,
        "clabe_destino": clabe,
        "instrucciones": (
            f"1. Proporciona esta CLABE a tu área de RH: {clabe}\n"
            "2. Solicita que tu siguiente nómina se deposite en Hey.\n"
            "3. Una vez recibida, activamos Hey Pro automáticamente y empiezas a ganar cashback."
        ),
        "sla_dias": 5,
        "message": "Portabilidad de nómina iniciada. Te avisaremos en cuanto recibamos tu primer depósito.",
        "error_code": None,
    }


def activateHeyProDirect(user_id: str) -> dict:
    """Mock tool: activate Hey Pro directly for users who already have payroll at Hey."""
    return {
        "success": True,
        "estado": "activado",
        "user_id": user_id,
        "mensaje": "¡Hey Pro activado! Ya empiezas a ganar 1% de cashback en todas tus compras.",
        "fecha_activacion": "hoy",
        "beneficios": ["1% cashback en compras", "Tasas de inversión preferenciales", "Acceso a Hey Shop"],
    }
