"""Enrich feat_uc1_alertas.parquet with §6.5 features (saldo alternativo, monto faltante).

Re-creates the §6.5 logic from notebooks/uc1/11_feature_eng_uc1_fh.ipynb without
requiring re-execution of the full notebook. Idempotent: safe to re-run.

Outputs:
- outputs/features/feat_uc1_alertas.parquet  (enriched, granularity = transaction)
- outputs/features/feat_uc1_user_risk.parquet (enriched, granularity = user)
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
BASE_DATA = ROOT / "Datathon_Hey_2026_dataset_transacciones 1" / "dataset_transacciones"
FEAT_DIR = ROOT / "outputs" / "features"

CUTOFF_DATE = pd.Timestamp("2025-10-31")


def load_raw():
    df_clientes = pd.read_csv(BASE_DATA / "hey_clientes.csv", low_memory=False)
    df_productos = pd.read_csv(BASE_DATA / "hey_productos.csv", low_memory=False)
    df_tx = pd.read_csv(BASE_DATA / "hey_transacciones.csv", low_memory=False)

    if "es_dato_sintetico" in df_clientes.columns:
        df_clientes = df_clientes.drop(columns=["es_dato_sintetico"])
    if "patron_uso_atipico" in df_clientes.columns:
        df_clientes = df_clientes.rename(
            columns={"patron_uso_atipico": "patron_uso_atipico_user"}
        )

    df_tx["fecha_hora"] = pd.to_datetime(df_tx["fecha_hora"], errors="coerce")
    df_tx = df_tx[df_tx["fecha_hora"] <= CUTOFF_DATE].copy()

    return df_clientes, df_productos, df_tx


def compute_alt_features(df_tx: pd.DataFrame, df_productos: pd.DataFrame) -> pd.DataFrame:
    """§6.5 — Saldo alternativo por transacción.

    Importante: extendemos el alcance del notebook original (que solo procesaba
    `saldo_insuficiente`) a `limite_excedido` también, porque el ticket UC1
    requiere ambos motivos para el trigger.
    """
    rechazos = df_tx[
        (df_tx["estatus"] == "no_procesada")
        & (df_tx["motivo_no_procesada"].isin(["saldo_insuficiente", "limite_excedido"]))
    ][["transaccion_id", "user_id", "monto", "producto_id", "motivo_no_procesada"]].copy()

    prods_activos = df_productos[df_productos["estatus"] == "activo"][
        ["user_id", "producto_id", "tipo_producto", "saldo_actual"]
    ].copy()

    merged_alt = rechazos.merge(prods_activos, on="user_id", suffixes=("_origen", "_alt"))
    merged_alt = merged_alt[
        merged_alt["producto_id_origen"] != merged_alt["producto_id_alt"]
    ]
    merged_alt = merged_alt[merged_alt["saldo_actual"].notna()].copy()
    merged_alt["_cubre"] = merged_alt["saldo_actual"] >= merged_alt["monto"]

    idx_best = merged_alt.groupby("transaccion_id")["saldo_actual"].idxmax().dropna().astype("int64")
    feat_alt = (
        merged_alt.loc[
            idx_best,
            [
                "transaccion_id",
                "producto_id_alt",
                "tipo_producto",
                "saldo_actual",
                "_cubre",
            ],
        ]
        .rename(
            columns={
                "producto_id_alt": "feat_producto_alternativo_id",
                "tipo_producto": "feat_tipo_producto_alternativo",
                "saldo_actual": "feat_monto_disponible_alternativo",
                "_cubre": "feat_tiene_saldo_alternativo",
            }
        )
        .reset_index(drop=True)
    )

    n_total = len(rechazos)
    n_resolubles = int(feat_alt["feat_tiene_saldo_alternativo"].sum())
    n_sin_alt = n_total - len(feat_alt)
    pct = n_resolubles / n_total if n_total else 0
    print(
        f"  Rechazos totales (saldo+limite)       : {n_total:,}\n"
        f"  Sin ningún producto alternativo       : {n_sin_alt:,}\n"
        f"  Con alternativo que cubre el monto    : {n_resolubles:,}  ({pct:.1%})\n"
        f"  Con alternativo pero saldo insuficiente: {len(feat_alt) - n_resolubles:,}"
    )
    return feat_alt, rechazos


def compute_monto_faltante(
    rechazos: pd.DataFrame,
    df_productos: pd.DataFrame,
    df_clientes: pd.DataFrame,
    feat_alt: pd.DataFrame,
) -> pd.DataFrame:
    saldo_origen = df_productos[["producto_id", "saldo_actual"]].rename(
        columns={"saldo_actual": "saldo_origen"}
    )
    rec = rechazos.merge(saldo_origen, on="producto_id", how="left")

    rec["feat_monto_faltante"] = (
        rec["monto"] - rec["saldo_origen"].fillna(0)
    ).clip(lower=0)

    rec = rec.merge(
        df_clientes[["user_id", "ingreso_mensual_mxn"]], on="user_id", how="left"
    )
    rec["feat_monto_faltante_pct_ingreso"] = (
        rec["feat_monto_faltante"] / rec["ingreso_mensual_mxn"]
    ).fillna(0).clip(upper=5.0)

    rec = rec.merge(
        feat_alt[
            [
                "transaccion_id",
                "feat_tiene_saldo_alternativo",
                "feat_monto_disponible_alternativo",
            ]
        ],
        on="transaccion_id",
        how="left",
    )
    rec["feat_es_resolucion_parcial"] = (
        rec["feat_monto_disponible_alternativo"].gt(0)
        & rec["feat_tiene_saldo_alternativo"].eq(False)
    ).fillna(False)

    print(
        "\n  Distribución de feat_monto_faltante (MXN):\n"
        + rec["feat_monto_faltante"]
        .describe(percentiles=[0.25, 0.5, 0.75, 0.9])
        .to_string()
    )
    return rec


def enrich_alertas(df_alertas: pd.DataFrame, feat_alt, rec) -> pd.DataFrame:
    feat_monto_txn = rec[
        [
            "transaccion_id",
            "feat_monto_faltante",
            "feat_monto_faltante_pct_ingreso",
            "feat_es_resolucion_parcial",
        ]
    ].drop_duplicates(subset=["transaccion_id"], keep="first")
    feat_alt = feat_alt.drop_duplicates(subset=["transaccion_id"], keep="first")

    df_alertas = df_alertas.merge(feat_alt, on="transaccion_id", how="left")
    df_alertas = df_alertas.merge(feat_monto_txn, on="transaccion_id", how="left")

    df_alertas["feat_tiene_saldo_alternativo"] = (
        df_alertas["feat_tiene_saldo_alternativo"].fillna(False)
    )
    df_alertas["feat_monto_disponible_alternativo"] = (
        df_alertas["feat_monto_disponible_alternativo"].fillna(0.0)
    )
    df_alertas["feat_monto_faltante"] = df_alertas["feat_monto_faltante"].fillna(0.0)
    df_alertas["feat_monto_faltante_pct_ingreso"] = (
        df_alertas["feat_monto_faltante_pct_ingreso"].fillna(0.0)
    )
    df_alertas["feat_es_resolucion_parcial"] = (
        df_alertas["feat_es_resolucion_parcial"].fillna(False)
    )
    return df_alertas


def enrich_user_risk(
    df_user: pd.DataFrame, feat_alt, rechazos, rec
) -> pd.DataFrame:
    feat_alt_user = (
        feat_alt.merge(
            rechazos[["transaccion_id", "user_id"]], on="transaccion_id", how="left"
        )
        .groupby("user_id")
        .agg(
            feat_pct_rechazos_resolubles=("feat_tiene_saldo_alternativo", "mean"),
            feat_max_monto_disponible_alt=("feat_monto_disponible_alternativo", "max"),
        )
        .reset_index()
    )

    feat_monto_user = (
        rec.groupby("user_id")
        .agg(
            feat_monto_faltante_mediano=("feat_monto_faltante", "median"),
            feat_monto_faltante_max=("feat_monto_faltante", "max"),
            feat_tiene_resolucion_parcial=("feat_es_resolucion_parcial", "any"),
        )
        .reset_index()
    )

    df_user = df_user.merge(feat_alt_user, on="user_id", how="left")
    df_user = df_user.merge(feat_monto_user, on="user_id", how="left")

    for col in [
        "feat_pct_rechazos_resolubles",
        "feat_max_monto_disponible_alt",
        "feat_monto_faltante_mediano",
        "feat_monto_faltante_max",
    ]:
        df_user[col] = df_user[col].fillna(0.0)
    df_user["feat_tiene_resolucion_parcial"] = df_user[
        "feat_tiene_resolucion_parcial"
    ].fillna(False)
    return df_user


def main():
    print("[1/5] Cargando datos raw...")
    df_clientes, df_productos, df_tx = load_raw()
    print(f"      clientes={df_clientes.shape}  productos={df_productos.shape}  tx={df_tx.shape}")

    print("[2/5] Calculando saldo alternativo (§6.5 ext. a saldo+limite)...")
    feat_alt, rechazos = compute_alt_features(df_tx, df_productos)

    print("\n[3/5] Calculando monto faltante...")
    rec = compute_monto_faltante(rechazos, df_productos, df_clientes, feat_alt)

    print("\n[4/5] Enriqueciendo feat_uc1_alertas.parquet...")
    df_alertas = pd.read_parquet(FEAT_DIR / "feat_uc1_alertas.parquet")
    pre_n = len(df_alertas)
    df_alertas = df_alertas.drop_duplicates(subset=["transaccion_id"], keep="first").reset_index(drop=True)
    if len(df_alertas) != pre_n:
        print(f"      (eliminados {pre_n - len(df_alertas)} duplicados de transaccion_id en parquet pre-existente)")
    print(f"      shape pre-enrich : {df_alertas.shape}")
    cols_existentes_a_borrar = [
        c for c in df_alertas.columns
        if c in {
            "feat_producto_alternativo_id",
            "feat_tipo_producto_alternativo",
            "feat_monto_disponible_alternativo",
            "feat_tiene_saldo_alternativo",
            "feat_monto_faltante",
            "feat_monto_faltante_pct_ingreso",
            "feat_es_resolucion_parcial",
        }
    ]
    if cols_existentes_a_borrar:
        df_alertas = df_alertas.drop(columns=cols_existentes_a_borrar)
        print(f"      (drop columnas previas: {cols_existentes_a_borrar})")
    df_alertas = enrich_alertas(df_alertas, feat_alt, rec)
    print(f"      shape post-enrich: {df_alertas.shape}")
    df_alertas.to_parquet(FEAT_DIR / "feat_uc1_alertas.parquet", index=False)

    print("\n[5/5] Enriqueciendo feat_uc1_user_risk.parquet...")
    df_user = pd.read_parquet(FEAT_DIR / "feat_uc1_user_risk.parquet")
    print(f"      shape pre-enrich : {df_user.shape}")
    cols_user_a_borrar = [
        c for c in df_user.columns
        if c in {
            "feat_pct_rechazos_resolubles",
            "feat_max_monto_disponible_alt",
            "feat_monto_faltante_mediano",
            "feat_monto_faltante_max",
            "feat_tiene_resolucion_parcial",
        }
    ]
    if cols_user_a_borrar:
        df_user = df_user.drop(columns=cols_user_a_borrar)
    df_user = enrich_user_risk(df_user, feat_alt, rechazos, rec)
    print(f"      shape post-enrich: {df_user.shape}")
    df_user.to_parquet(FEAT_DIR / "feat_uc1_user_risk.parquet", index=False)

    print("\nOK — parquets enriquecidos en:", FEAT_DIR)


if __name__ == "__main__":
    main()
