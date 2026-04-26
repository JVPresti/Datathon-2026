"""UC1 — Asistente Financiero Proactivo.

Functions:
    build_context_uc1(txn_id, user_id, dfs) -> dict
    transferFunds(from_producto_id, to_producto_id, monto, user_id) -> dict
    get_uc1_candidates(dfs) -> pd.DataFrame
"""
import pandas as pd

MOTIVOS_UC1 = {"saldo_insuficiente", "limite_excedido"}
PRIORIDAD_PRODUCTO = {
    "cuenta_debito": 1,
    "inversion_hey": 2,
    "tarjeta_credito_hey": 3,
    "cuenta_ahorro": 4,
    "credito_nomina": 5,
    "credito_personal": 6,
}
MONTO_MINIMO = 50.0
COOLDOWN_HORAS = 24


def get_uc1_candidates(dfs: dict) -> pd.DataFrame:
    """Return rejected transactions resolvable by UC1 (with sufficient alternative balance)."""
    df_tx = dfs["transacciones"]
    df_prod = dfs["productos"]

    rechazos = df_tx[
        (df_tx["estatus"] == "no_procesada")
        & (df_tx["motivo_no_procesada"].isin(MOTIVOS_UC1))
        & (df_tx["monto"] >= MONTO_MINIMO)
    ].copy()

    # Build max-saldo per user across eligible active products
    max_alt = (
        df_prod[
            (df_prod["estatus"] == "activo")
            & (df_prod["tipo_producto"].isin(PRIORIDAD_PRODUCTO.keys()))
        ]
        .groupby("user_id")["saldo_actual"]
        .max()
        .reset_index()
        .rename(columns={"saldo_actual": "max_saldo_alt"})
    )

    rechazos = rechazos.merge(max_alt, on="user_id", how="inner")
    # Keep only those where at least one product covers the amount
    rechazos = rechazos[rechazos["max_saldo_alt"] >= rechazos["monto"]].copy()
    rechazos["label"] = rechazos.apply(
        lambda r: f"{r['transaccion_id']} — ${r['monto']:,.0f} en {r['comercio_nombre']} ({r['motivo_no_procesada']})",
        axis=1,
    )
    return rechazos.sort_values("monto", ascending=False).head(200)


def build_context_uc1(txn_id: str, user_id: str, dfs: dict) -> dict:
    """Build Havi context payload for UC1 (rejected transaction alert)."""
    df_tx = dfs["transacciones"]
    df_prod = dfs["productos"]
    df_cli = dfs["clientes"]

    txn_rows = df_tx[df_tx["transaccion_id"] == txn_id]
    if txn_rows.empty:
        raise ValueError(f"Transaction {txn_id} not found")
    txn = txn_rows.iloc[0]

    cli_rows = df_cli[df_cli["user_id"] == user_id]
    cliente = cli_rows.iloc[0] if not cli_rows.empty else pd.Series(dtype=object)

    prod_origen_rows = df_prod[df_prod["producto_id"] == txn.get("producto_id", "")]
    prod_origen = prod_origen_rows.iloc[0] if not prod_origen_rows.empty else None

    prods_usuario = df_prod[
        (df_prod["user_id"] == user_id)
        & (df_prod["estatus"] == "activo")
        & (df_prod["tipo_producto"].isin(PRIORIDAD_PRODUCTO.keys()))
        & (df_prod["saldo_actual"] >= txn["monto"])
    ].copy()

    prod_alt = None
    if not prods_usuario.empty:
        prods_usuario = prods_usuario.copy()
        prods_usuario["_prio"] = prods_usuario["tipo_producto"].map(PRIORIDAD_PRODUCTO)
        prod_alt = prods_usuario.sort_values("_prio").iloc[0]

    # Count chronic rejections in last 30 days (approximate with full history)
    rechazos_usuario = df_tx[
        (df_tx["user_id"] == user_id)
        & (df_tx["estatus"] == "no_procesada")
        & (df_tx["motivo_no_procesada"].isin(MOTIVOS_UC1))
    ]
    es_cronico = len(rechazos_usuario) >= 3

    saldo_origen = float(prod_origen["saldo_actual"]) if prod_origen is not None else 0.0

    return {
        "user_id": user_id,
        "transaccion_id": txn_id,
        "situacion": "rechazo_por_saldo" if txn["motivo_no_procesada"] == "saldo_insuficiente" else "rechazo_por_limite",
        "motivo": str(txn["motivo_no_procesada"]),
        "monto_rechazado": float(txn["monto"]),
        "comercio": str(txn["comercio_nombre"]) if pd.notna(txn["comercio_nombre"]) else str(txn["categoria_mcc"]),
        "ciudad_transaccion": str(txn["ciudad_transaccion"]) if pd.notna(txn.get("ciudad_transaccion")) else "N/A",
        "fecha_hora": str(txn["fecha_hora"]),
        "es_internacional": bool(txn["es_internacional"]),
        "nombre_usuario": f"cliente {user_id}",
        "saldo_actual_producto_origen": saldo_origen,
        "monto_faltante": max(0.0, float(txn["monto"]) - saldo_origen),
        "tiene_alternativo": prod_alt is not None,
        "producto_alternativo": str(prod_alt["tipo_producto"]) if prod_alt is not None else None,
        "producto_alternativo_id": str(prod_alt["producto_id"]) if prod_alt is not None else None,
        "monto_disponible_alternativo": float(prod_alt["saldo_actual"]) if prod_alt is not None else None,
        "es_cronico": es_cronico,
        "canal_preferido": str(cliente.get("preferencia_canal", "app")) if not cliente.empty else "app",
    }


def transferFunds(from_producto_id: str, to_producto_id: str, monto: float, user_id: str) -> dict:
    """Mock tool: transfer funds between products to cover a rejection."""
    if not from_producto_id or not to_producto_id:
        return {"success": False, "error_code": "PRODUCTO_INVALIDO", "message": "Producto origen o destino no especificado."}
    if monto <= 0:
        return {"success": False, "error_code": "MONTO_INVALIDO", "message": "El monto debe ser mayor a $0."}
    return {
        "success": True,
        "transfer_id": f"TRF-{user_id[-5:]}-{int(monto)}",
        "from_producto_id": from_producto_id,
        "to_producto_id": to_producto_id,
        "monto_transferido": monto,
        "user_id": user_id,
        "nuevo_estatus_txn": "completada",
        "message": f"Se transfirieron ${monto:,.2f} MXN exitosamente. Tu compra fue procesada.",
        "sla_seg": 3,
    }
