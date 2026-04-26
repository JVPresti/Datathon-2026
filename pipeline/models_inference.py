"""
models_inference.py — Carga y expone inferencia de los 3 modelos ML entrenados.

Modelos disponibles:
  - RF Liquidez  (UC2): RandomForest que predice si usuario tendrá déficit a fin de mes
                        → predict_proba → probabilidad de déficit + flag de alerta
  - LR Baseline  (UC2): Logistic Regression baseline (referencia)
  - IsoForest    (UC4): IsolationForest que puntúa anomalía de una transacción

Los modelos fueron entrenados con scikit-learn 1.6.1 y requieren Python 3.12 + sklearn 1.8.0.
"""

from __future__ import annotations

import warnings
import math
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

ROOT       = Path(__file__).resolve().parent.parent
MODELS_DIR = ROOT / "outputs" / "models"

# ── Threshold óptimo del RF (del uc2_metrics.json, threshold_optimo=0.2) ──────
RF_THRESHOLD = 0.2

# ── Features exactas que el RF espera (del build_uc2_model.py) ───────────────
RF_FEATURES = [
    "delta_score_mensual",
    "feat_dem_edad", "feat_dem_ingreso_log", "feat_dem_score_buro",
    "feat_dem_ingreso_cuartil",
    "feat_eng_es_hey_pro", "feat_eng_nomina_domiciliada", "feat_eng_recibe_remesas",
    "feat_eng_satisfaccion", "feat_eng_dias_desde_ultimo_login",
    "feat_port_n_productos_activos",
    "feat_time_weekend_ratio", "feat_time_nocturnal_ratio",
    "feat_risk_n_rechazos_anual", "feat_risk_n_rechazos_30d",
    "feat_risk_n_disputas", "feat_risk_pct_atipicas", "feat_risk_pct_reintento",
    "gasto_discrecional_pct",
    "pct_ingreso_comprometido",
    "dias_al_corte",
]

# ── Features del IsolationForest (del build_uc4_isoforest.py) ─────────────────
ISO_FEATURES = [
    "z_monto", "z_hora", "es_internacional", "ciudad_nueva", "intento_numero",
    "sig_internacional", "sig_hora_atipica", "sig_ciudad_nueva",
    "sig_monto_extremo", "sig_reintento",
    "perfil_pct_internacional", "perfil_n_txn", "perfil_monto_std", "perfil_hora_std",
]


class MLModels:
    """Singleton que carga los modelos en memoria y expone métodos de inferencia."""

    pipe_rf:  object | None = None
    pipe_lr:  object | None = None
    iso:      object | None = None
    loaded:   bool = False

    def load(self):
        """Carga los 3 modelos al arrancar el servidor."""
        print("[MLModels] Cargando modelos ML...")
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            self.pipe_rf  = joblib.load(MODELS_DIR / "uc2_liquidez_rf.pkl")
            self.pipe_lr  = joblib.load(MODELS_DIR / "uc2_liquidez_lr_baseline.pkl")
            self.iso      = joblib.load(MODELS_DIR / "uc4_iso_forest.pkl")
        self.loaded = True
        print("[MLModels] OK uc2_liquidez_rf.pkl")
        print("[MLModels] OK uc2_liquidez_lr_baseline.pkl")
        print("[MLModels] OK uc4_iso_forest.pkl")
        print("[MLModels] Carga completa.")

    # ── UC2: Predicción de riesgo de liquidez ─────────────────────────────────
    def predict_liquidez(
        self,
        uc2_row: dict,
        score_row: dict,
        txn_profile_row: dict | None = None,
    ) -> dict:
        """
        Infiere la probabilidad de déficit financiero a fin de mes para un usuario.
        Extrae el RandomForestClassifier raw del pipeline para evitar el SimpleImputer
        serializado (incompatible entre sklearn 1.6.1 → 1.8.0).
        """
        if not self.loaded or self.pipe_rf is None:
            return {"prob_deficit": None, "alerta_liquidez": False, "nivel_riesgo": "desconocido"}

        try:
            carga_fija  = float(score_row.get("carga_fija_total",   0) or 0)
            ingreso     = float(score_row.get("ingreso_mensual_mxn", 1) or 1)
            delta_score = float(score_row.get("delta_score_mensual", 0) or 0)
            pct_ing_comp = min(carga_fija / max(ingreso, 1), 5.0)

            row_values = {
                "delta_score_mensual":              delta_score,
                "feat_dem_edad":                    float(uc2_row.get("feat_dem_edad",                   35)  or 35),
                "feat_dem_ingreso_log":             float(uc2_row.get("feat_dem_ingreso_log",            10)  or 10),
                "feat_dem_score_buro":              float(uc2_row.get("feat_dem_score_buro",             600) or 600),
                "feat_dem_ingreso_cuartil":         float(uc2_row.get("feat_dem_ingreso_cuartil",        2)   or 2),
                "feat_eng_es_hey_pro":              int(bool(uc2_row.get("feat_eng_es_hey_pro",          False))),
                "feat_eng_nomina_domiciliada":      int(bool(uc2_row.get("feat_eng_nomina_domiciliada",  False))),
                "feat_eng_recibe_remesas":          int(bool(uc2_row.get("feat_eng_recibe_remesas",      False))),
                "feat_eng_satisfaccion":            float(uc2_row.get("feat_eng_satisfaccion",           7)   or 7),
                "feat_eng_dias_desde_ultimo_login": float(uc2_row.get("feat_eng_dias_desde_ultimo_login",30)  or 30),
                "feat_port_n_productos_activos":    float(uc2_row.get("feat_port_n_productos_activos",   1)   or 1),
                "feat_time_weekend_ratio":          float(uc2_row.get("feat_time_weekend_ratio",         0.3) or 0.3),
                "feat_time_nocturnal_ratio":        float(uc2_row.get("feat_time_nocturnal_ratio",       0.05)or 0.05),
                "feat_risk_n_rechazos_anual":       float(uc2_row.get("feat_risk_n_rechazos_anual",      0)   or 0),
                "feat_risk_n_rechazos_30d":         float(uc2_row.get("feat_risk_n_rechazos_30d",        0)   or 0),
                "feat_risk_n_disputas":             float(uc2_row.get("feat_risk_n_disputas",            0)   or 0),
                "feat_risk_pct_atipicas":           float(uc2_row.get("feat_risk_pct_atipicas",          0)   or 0),
                "feat_risk_pct_reintento":          float(uc2_row.get("feat_risk_pct_reintento",         0)   or 0),
                "gasto_discrecional_pct":           float(uc2_row.get("gasto_discrecional_pct",          0.2) or 0.2),
                "pct_ingreso_comprometido":         pct_ing_comp,
                "dias_al_corte":                    -3,
            }

            X = pd.DataFrame([row_values])[RF_FEATURES].astype(float)

            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                # Extraemos el clasificador raw del pipeline, evitando el SimpleImputer
                # serializado que es incompatible entre sklearn 1.6.1 → 1.8.0
                clf = self.pipe_rf.named_steps["clf"]
                X_arr = X.fillna(X.median()).values  # imputación manual con mediana
                prob = float(clf.predict_proba(X_arr)[0, 1])

            alerta = prob >= RF_THRESHOLD
            if prob >= 0.7:   nivel = "critico"
            elif prob >= 0.4: nivel = "alto"
            elif prob >= 0.2: nivel = "moderado"
            else:             nivel = "bajo"

            return {
                "prob_deficit":             round(prob, 3),
                "alerta_liquidez":          alerta,
                "nivel_riesgo":             nivel,
                "ingreso_comprometido_pct": round(pct_ing_comp * 100, 1),
            }

        except Exception as e:
            print(f"[MLModels] Error en predict_liquidez: {e}")
            return {"prob_deficit": None, "alerta_liquidez": False, "nivel_riesgo": "error"}


    # ── UC4: Score de anomalía de una transacción (IsolationForest) ───────────
    def score_transaccion(self, txn_profile_row: dict) -> dict:
        """
        Puntúa el nivel de anomalía de una transacción usando el IsolationForest.

        Recibe un dict con las features de feat_uc4_txn_profile (o feat_uc1_alertas enriquecido).

        Output: {
          'iso_anomaly_score': float,   # mayor = más anómalo (negado de score_samples)
          'iso_is_anomaly': bool,       # True si predict == -1 (dentro del 5% más anómalo)
        }
        """
        if not self.loaded or self.iso is None:
            return {"iso_anomaly_score": None, "iso_is_anomaly": False}

        try:
            row_values = {feat: float(txn_profile_row.get(feat, 0) or 0) for feat in ISO_FEATURES}
            X = pd.DataFrame([row_values])[ISO_FEATURES]

            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                score     = float(-self.iso.score_samples(X)[0])
                is_anomaly = bool(self.iso.predict(X)[0] == -1)

            return {
                "iso_anomaly_score": round(score, 4),
                "iso_is_anomaly":    is_anomaly,
            }

        except Exception as e:
            print(f"[MLModels] Error en score_transaccion: {e}")
            return {"iso_anomaly_score": None, "iso_is_anomaly": False}


# Instancia global
ML = MLModels()
