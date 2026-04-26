"""
data_loader.py — Carga y cacheo de todos los datasets y features en memoria.
Se importa una sola vez al iniciar FastAPI (startup event) para baja latencia.

Estructura en memoria:
  - DL.clientes          : DataFrame 15,025 × 22  (raw hey_clientes.csv)
  - DL.productos         : DataFrame 38,909 × 12  (raw hey_productos.csv)
  - DL.uc1_alertas       : DataFrame 60,739 × 14  (feat_uc1_alertas.parquet — alertas/rechazos)
  - DL.uc1_risk          : DataFrame 15,025 × 26  (feat_uc1_user_risk.parquet — riesgo por user)
  - DL.uc2_personas      : DataFrame 15,025 × 68  (feat_uc2_personas.parquet — gemelo digital)
  - DL.uc3_candidates    : DataFrame 78,563 × 8   (feat_uc3_candidates.parquet — upselling)
  - DL.uc4_users         : DataFrame 14,095 × 25  (feat_uc4_users.parquet — perfil conversacional)
  - DL.convs             : DataFrame 49,999 × 6   (raw conversaciones parquet)
  - DL.score_riesgo      : DataFrame 15,025 × 17  (score_riesgo_usuarios.csv — UC2 liquidez)
  - DL.cashback          : DataFrame 7,680  × 4   (uc3_cashback_perdido.csv — cashback perdido)
  - DL.txn_profile       : DataFrame ~319k × N    (feat_uc4_txn_profile.parquet — para IsoForest)
  - DL.prods_by_user     : dict  user_id → sub-DataFrame de productos activos
  - DL.uc1_risk_idx      : dict  user_id → Series (fila de riesgo, acceso O(1))
  - DL.uc2_idx           : dict  user_id → Series
  - DL.uc4_idx           : dict  user_id → Series
  - DL.score_idx         : dict  user_id → Series con carga_fija_total e ingreso_mensual_mxn
  - DL.txn_profile_idx   : dict  user_id → sub-DataFrame de transacciones de compra (para IsoForest)
"""

from __future__ import annotations

import unicodedata
from pathlib import Path
from typing import Optional
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent          # d:/Datamoles
BASE_TXN  = ROOT / "Datathon_Hey_2026_dataset_transacciones 1" / "dataset_transacciones"
BASE_CONV = ROOT / "Datathon_Hey_dataset_conversaciones 1" / "dataset_conversaciones"
FEAT_DIR  = ROOT / "outputs" / "features"
OUT_DIR   = ROOT / "outputs"


def _clean_text(s) -> str:
    if pd.isna(s):
        return ""
    return unicodedata.normalize("NFKD", str(s))


class DataLoader:
    """Singleton que mantiene todos los datos en RAM. Se inicializa una sola vez."""

    clientes: pd.DataFrame
    productos: pd.DataFrame
    uc1_alertas: pd.DataFrame
    uc1_risk: pd.DataFrame
    uc2_personas: pd.DataFrame
    uc3_candidates: pd.DataFrame
    uc4_users: pd.DataFrame
    convs: pd.DataFrame
    score_riesgo: pd.DataFrame
    cashback: pd.DataFrame
    txn_profile: pd.DataFrame

    # Índices O(1) por user_id
    prods_by_user:    dict
    uc1_risk_idx:     dict
    uc2_idx:          dict
    uc4_idx:          dict
    score_idx:        dict
    clientes_idx:     dict
    txn_profile_idx:  dict  # user_id → rows del perfil transaccional (para IsoForest)

    def load(self):
        print("[DataLoader] Cargando datasets en memoria...")

        # ── Raw datasets ─────────────────────────────────────────────────────
        self.clientes = pd.read_csv(
            BASE_TXN / "hey_clientes.csv",
            dtype={"user_id": str}
        )
        self.productos = pd.read_csv(
            BASE_TXN / "hey_productos.csv",
            dtype={"producto_id": str, "user_id": str},
        )
        # Limpiar artefacto sintético
        for df in [self.productos]:
            if "es_dato_sintetico" in df.columns:
                df.drop(columns=["es_dato_sintetico"], inplace=True)

        # ── Feature datasets ─────────────────────────────────────────────────
        self.uc1_alertas    = pd.read_parquet(FEAT_DIR / "feat_uc1_alertas.parquet")
        self.uc1_risk       = pd.read_parquet(FEAT_DIR / "feat_uc1_user_risk.parquet")
        self.uc2_personas   = pd.read_parquet(FEAT_DIR / "feat_uc2_personas.parquet")
        self.uc3_candidates = pd.read_parquet(FEAT_DIR / "feat_uc3_candidates.parquet")
        self.uc4_users      = pd.read_parquet(FEAT_DIR / "feat_uc4_users.parquet")

        # ── Conversaciones raw (para few-shot UC4) ────────────────────────────
        self.convs = pd.read_parquet(BASE_CONV / "dataset_50k_anonymized.parquet")
        self.convs["date"] = pd.to_datetime(self.convs["date"], format="mixed")
        self.convs["input"]  = self.convs["input"].apply(_clean_text)
        self.convs["output"] = self.convs["output"].apply(_clean_text)
        if "es_dato_sintetico" in self.convs.columns:
            self.convs.drop(columns=["es_dato_sintetico"], inplace=True)

        # ── Outputs de modelo ─────────────────────────────────────────────────
        # Leer score_riesgo con todas las columnas (incl. carga_fija_total e ingreso_mensual_mxn
        # que el RF de liquidez necesita para calcular pct_ingreso_comprometido)
        self.score_riesgo = pd.read_csv(OUT_DIR / "score_riesgo_usuarios.csv", dtype={"user_id": str})
        self.cashback     = pd.read_csv(OUT_DIR / "uc3_cashback_perdido.csv",  dtype={"user_id": str})

        # feat_uc4_txn_profile: perfil de transacciones por usuario (usado por IsoForest)
        # Cargamos solo las columnas que necesita el modelo para ahorrar RAM
        ISO_COLS = ["user_id", "transaccion_id", "fecha_hora",
                    "z_monto", "z_hora", "es_internacional", "ciudad_nueva", "intento_numero",
                    "sig_internacional", "sig_hora_atipica", "sig_ciudad_nueva",
                    "sig_monto_extremo", "sig_reintento",
                    "perfil_pct_internacional", "perfil_n_txn", "perfil_monto_std", "perfil_hora_std"]
        txn_raw = pd.read_parquet(FEAT_DIR / "feat_uc4_txn_profile.parquet")
        # Conservar solo las columnas disponibles
        available = [c for c in ISO_COLS if c in txn_raw.columns]
        self.txn_profile = txn_raw[available].copy()

        # ── Índices O(1) ──────────────────────────────────────────────────────
        self.prods_by_user    = {uid: g for uid, g in self.productos.groupby("user_id")}
        self.uc1_risk_idx     = self.uc1_risk.set_index("user_id").to_dict("index")
        self.uc2_idx          = self.uc2_personas.set_index("user_id").to_dict("index")
        self.uc4_idx          = self.uc4_users.set_index("user_id").to_dict("index")
        self.score_idx        = self.score_riesgo.set_index("user_id").to_dict("index")
        self.clientes_idx     = self.clientes.set_index("user_id").to_dict("index")
        # Índice del perfil transaccional: user_id → lista de filas (para IsoForest)
        self.txn_profile_idx  = {uid: g.to_dict("records") for uid, g in self.txn_profile.groupby("user_id")}

        print(f"[DataLoader] OK Clientes: {len(self.clientes):,}")
        print(f"[DataLoader] OK Productos: {len(self.productos):,}")
        print(f"[DataLoader] OK UC1 alertas: {len(self.uc1_alertas):,}")
        print(f"[DataLoader] OK UC3 candidates: {len(self.uc3_candidates):,}")
        print(f"[DataLoader] OK Conversaciones: {len(self.convs):,}")
        print(f"[DataLoader] OK TXN profile (IsoForest): {len(self.txn_profile):,}")
        print("[DataLoader] Carga completa.")


# Instancia global (singleton)
DL = DataLoader()
