"""Central data loader for all UC integration modules.

Call load_all() once and pass the resulting DataFrames to each UC module.
"""
from pathlib import Path
import pandas as pd

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
BASE_TXN  = _PROJECT_ROOT / "Datathon_Hey_2026_dataset_transacciones 1" / "dataset_transacciones"
BASE_CONV = _PROJECT_ROOT / "Datathon_Hey_dataset_conversaciones 1" / "dataset_conversaciones"
BASE_OUT  = _PROJECT_ROOT / "outputs"


def load_clientes() -> pd.DataFrame:
    return pd.read_csv(BASE_TXN / "hey_clientes.csv")


def load_productos() -> pd.DataFrame:
    return pd.read_csv(BASE_TXN / "hey_productos.csv")


def load_transacciones() -> pd.DataFrame:
    df = pd.read_csv(BASE_TXN / "hey_transacciones.csv", parse_dates=["fecha_hora"])
    return df


def load_conversaciones() -> pd.DataFrame:
    return pd.read_parquet(BASE_CONV / "dataset_50k_anonymized.parquet")


def load_score_riesgo() -> pd.DataFrame:
    return pd.read_csv(BASE_OUT / "score_riesgo_usuarios.csv")


def load_proyeccion() -> pd.DataFrame:
    return pd.read_csv(BASE_OUT / "proyeccion_gastos_fin_mes.csv")


def load_cashback_perdido() -> pd.DataFrame:
    return pd.read_csv(BASE_OUT / "uc3_cashback_perdido.csv")


def load_all() -> dict:
    """Load all datasets and return as a dict of DataFrames."""
    return {
        "clientes":        load_clientes(),
        "productos":       load_productos(),
        "transacciones":   load_transacciones(),
        "score_riesgo":    load_score_riesgo(),
        "proyeccion":      load_proyeccion(),
        "cashback_perdido": load_cashback_perdido(),
    }
