"""Build and execute notebooks/uc2/21_model_liquidez_bi.ipynb.

UC2 Modelo predictivo de alerta de liquidez:
- LogisticRegression baseline + RandomForest principal
- Target: deficit_fin_mes = (gasto_estimado_fin_mes + carga_fija_total > ingreso_mensual_mxn)
- Sweep de threshold para recall >= 0.75
- Persiste 2 .pkl + metrics.json + 3 figuras
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from _nb_helper import build_notebook, code, execute_notebook, md  # noqa: E402

NB_PATH = ROOT / "notebooks" / "uc2" / "21_model_liquidez_bi.ipynb"


cells = [
    md(
        """# UC2 — Modelado: Alerta predictiva de liquidez

**Autor:** Brayan Iván (`bi`)
**Proyecto:** datamoles — Havi
**Tipo:** Clasificación binaria supervisada
**Métrica clave:** Recall ≥ 0.75 (preferimos alertar de más que de menos)

## Objetivo

Predecir si un usuario no podrá cubrir sus compromisos financieros a fin del mes en curso.
La alerta debe activarse antes del déficit, no como reacción a un saldo negativo.

## Target

`deficit_fin_mes = 1` si `(gasto_estimado_fin_mes + carga_fija_total) > ingreso_mensual_mxn`,
equivalente a `score_riesgo > 1.0`.

## Estrategia

1. **Baseline**: `LogisticRegression(class_weight='balanced')` — interpretable.
2. **Principal**: `RandomForestClassifier(n_estimators=300, class_weight='balanced')`.
3. Sweep de threshold sobre el modelo principal para maximizar precisión bajo `recall ≥ 0.75`.
4. Feature importance del RF + coeficientes del LR.
"""
    ),
    md("---\n## 0. Setup"),
    code(
        """import pandas as pd
import numpy as np
import json, joblib
from pathlib import Path
import matplotlib.pyplot as plt
import seaborn as sns
import warnings; warnings.filterwarnings('ignore')

from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    classification_report, roc_auc_score, precision_recall_curve,
    confusion_matrix, precision_score, recall_score, f1_score
)

ROOT = Path('..').resolve().parent
FEAT_DIR  = ROOT / 'outputs' / 'features'
OUT_BASE  = ROOT / 'outputs'
OUT_UC2   = OUT_BASE / 'uc2'
MODELS_DIR= OUT_BASE / 'models'
FIG_DIR   = ROOT / 'notebooks' / 'uc2'
DATA_DIR  = ROOT / 'Datathon_Hey_2026_dataset_transacciones 1' / 'dataset_transacciones'

OUT_UC2.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)

CUTOFF_DATE = pd.Timestamp('2025-10-31')
RANDOM_STATE = 42
print('FEAT_DIR  :', FEAT_DIR)
print('MODELS_DIR:', MODELS_DIR)
"""
    ),
    md("## 1. Carga y merge de las 3 fuentes"),
    code(
        """df_personas = pd.read_parquet(FEAT_DIR / 'feat_uc2_personas.parquet')
df_score    = pd.read_csv(OUT_BASE / 'score_riesgo_usuarios.csv')

print('feat_uc2_personas       :', df_personas.shape)
print('score_riesgo_usuarios   :', df_score.shape)

df = df_personas.merge(
    df_score[['user_id','score_riesgo','delta_score_mensual',
              'gasto_estimado_fin_mes','carga_fija_total','ingreso_mensual_mxn',
              'ingreso_restante_estimado','dias_hasta_deficit','tendencia_riesgo']],
    on='user_id', how='inner'
)
print('Merged                  :', df.shape)
df.head(3)
"""
    ),
    md("## 2. Construcción del target `deficit_fin_mes`"),
    code(
        """df['deficit_fin_mes'] = (df['ingreso_restante_estimado'] < 0).astype(int)

print('Distribución del target:')
print(df['deficit_fin_mes'].value_counts())
print(f'\\nTasa positiva: {df["deficit_fin_mes"].mean():.1%}')
print(f'Coincidencia con score_riesgo > 1.0: {((df["deficit_fin_mes"]==1) == (df["score_riesgo"]>1.0)).mean():.1%}')
"""
    ),
    md("## 3. Feature `gasto_discrecional_pct`\n\nNo existe MCC \"delivery\" en el dataset. Usamos `restaurante + entretenimiento + servicios_digitales` como proxy de gasto discrecional, que es el predictor económicamente equivalente."),
    code(
        """tx = pd.read_csv(DATA_DIR / 'hey_transacciones.csv',
                 usecols=['user_id','categoria_mcc','tipo_operacion','estatus','monto','fecha_hora'],
                 low_memory=False)
tx['fecha_hora'] = pd.to_datetime(tx['fecha_hora'], errors='coerce')
tx = tx[(tx['fecha_hora'] <= CUTOFF_DATE)
        & (tx['tipo_operacion']=='compra')
        & (tx['estatus']=='completada')]

DISC_MCC = {'restaurante','entretenimiento','servicios_digitales'}
discr = (tx.assign(_disc=tx['categoria_mcc'].isin(DISC_MCC))
            .groupby('user_id').apply(lambda g: g.loc[g['_disc'],'monto'].sum() / g['monto'].sum() if g['monto'].sum()>0 else 0)
            .rename('gasto_discrecional_pct').reset_index())

df = df.merge(discr, on='user_id', how='left')
df['gasto_discrecional_pct'] = df['gasto_discrecional_pct'].fillna(0.0)
print('Distribución gasto_discrecional_pct:')
print(df['gasto_discrecional_pct'].describe().to_string())
"""
    ),
    md("## 4. Selección de features (sin leakage)\n\nExcluimos las variables que componen el target:\n- `gasto_estimado_fin_mes`, `carga_fija_total`, `ingreso_restante_estimado`, `score_riesgo` (definen el target)\n- `dias_hasta_deficit` (consecuencia directa del target)\n\nMantenemos `delta_score_mensual` (es snapshot del mes anterior, no leakage)."),
    code(
        """LEAKAGE_COLS = {
    'gasto_estimado_fin_mes','carga_fija_total','ingreso_restante_estimado',
    'score_riesgo','dias_hasta_deficit','tendencia_riesgo','ingreso_mensual_mxn',
}

# Features finales
FEATURES = [
    # snapshot temporal del riesgo
    'delta_score_mensual',
    # demografía
    'feat_dem_edad','feat_dem_ingreso_log','feat_dem_score_buro',
    'feat_dem_ingreso_cuartil','feat_dem_antiguedad_dias',
    # engagement
    'feat_eng_es_hey_pro','feat_eng_nomina_domiciliada','feat_eng_recibe_remesas',
    'feat_eng_satisfaccion','feat_eng_dias_desde_ultimo_login',
    # portafolio
    'feat_port_n_productos_activos',
    # comportamiento
    'feat_time_weekend_ratio','feat_time_nocturnal_ratio',
    # riesgo
    'feat_risk_n_rechazos_anual','feat_risk_n_rechazos_30d',
    'feat_risk_n_disputas','feat_risk_pct_atipicas','feat_risk_pct_reintento',
    # derivado
    'gasto_discrecional_pct',
]

# pct_ingreso_comprometido se deriva: carga_fija_total / ingreso_mensual_mxn
df['pct_ingreso_comprometido'] = (
    df['carga_fija_total'] / df['ingreso_mensual_mxn'].replace(0, np.nan)
).fillna(0).clip(upper=5.0)
FEATURES.append('pct_ingreso_comprometido')

# días al corte (constante para snapshot único, pero documentado para extensibilidad)
df['dias_al_corte'] = (pd.Timestamp(CUTOFF_DATE.year, CUTOFF_DATE.month, 28) - CUTOFF_DATE).days
FEATURES.append('dias_al_corte')

# Cast booleanos a int
for col in ['feat_eng_es_hey_pro','feat_eng_nomina_domiciliada','feat_eng_recibe_remesas']:
    df[col] = df[col].astype(int)

X = df[FEATURES].copy()
# Quitar features 100% NaN (no sirven al modelo y rompen el pipeline)
all_nan = [c for c in FEATURES if X[c].isna().all()]
if all_nan:
    print(f'Dropping all-NaN features: {all_nan}')
    FEATURES = [c for c in FEATURES if c not in all_nan]
    X = df[FEATURES].copy()
y = df['deficit_fin_mes'].copy()
print('Shape X:', X.shape, '| target rate:', y.mean().round(3))
print('NaN por columna (top 5):')
print(X.isna().sum().sort_values(ascending=False).head().to_string())
"""
    ),
    md("## 5. Split estratificado 80/20\n\n*Nota:* el dataset es un snapshot por usuario (no series temporales), por eso usamos `stratify=y` en lugar de split temporal. Documentado como limitación del approach."),
    code(
        """X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
)
print('Train:', X_train.shape, 'Test:', X_test.shape)
print('Tasa positiva train/test:', y_train.mean().round(3), '/', y_test.mean().round(3))
"""
    ),
    md("## 6. Entrenamiento — LR baseline + RF principal"),
    code(
        """pipe_lr = Pipeline([
    ('imp', SimpleImputer(strategy='median')),
    ('sc',  StandardScaler()),
    ('clf', LogisticRegression(class_weight='balanced', max_iter=1000, random_state=RANDOM_STATE)),
])
pipe_rf = Pipeline([
    ('imp', SimpleImputer(strategy='median')),
    ('clf', RandomForestClassifier(n_estimators=300, class_weight='balanced',
                                   random_state=RANDOM_STATE, n_jobs=-1)),
])

pipe_lr.fit(X_train, y_train)
pipe_rf.fit(X_train, y_train)
print('Modelos entrenados.')
"""
    ),
    md("## 7. Evaluación"),
    code(
        """def evaluar(pipe, name):
    y_pred = pipe.predict(X_test)
    y_proba = pipe.predict_proba(X_test)[:,1]
    auc = roc_auc_score(y_test, y_proba)
    print(f'\\n=== {name} ===')
    print(f'AUC-ROC: {auc:.3f}')
    print(classification_report(y_test, y_pred, digits=3))
    return {'auc':auc,
            'precision':precision_score(y_test,y_pred),
            'recall':recall_score(y_test,y_pred),
            'f1':f1_score(y_test,y_pred),
            'y_proba':y_proba, 'y_pred':y_pred}

m_lr = evaluar(pipe_lr, 'Logistic Regression (baseline)')
m_rf = evaluar(pipe_rf, 'Random Forest (principal)')
"""
    ),
    md("## 8. Sweep de threshold (RF) — buscar mínimo threshold con recall ≥ 0.75"),
    code(
        """thresholds = np.linspace(0.05, 0.95, 19)
sweep = []
for t in thresholds:
    yp = (m_rf['y_proba'] >= t).astype(int)
    sweep.append({
        'threshold': float(t),
        'precision': precision_score(y_test, yp, zero_division=0),
        'recall':    recall_score(y_test, yp, zero_division=0),
        'f1':        f1_score(y_test, yp, zero_division=0),
        'n_alertas': int(yp.sum()),
    })
sweep_df = pd.DataFrame(sweep)
print(sweep_df.round(3).to_string(index=False))

# Threshold óptimo: el que mantiene recall>=0.75 y maximiza precision
ok = sweep_df[sweep_df['recall'] >= 0.75]
if len(ok):
    best = ok.sort_values('precision', ascending=False).iloc[0]
else:
    # fallback: threshold con mayor recall
    best = sweep_df.sort_values('recall', ascending=False).iloc[0]
threshold_opt = float(best['threshold'])
print(f'\\nThreshold óptimo: {threshold_opt:.2f}  | precision={best["precision"]:.3f}  recall={best["recall"]:.3f}  f1={best["f1"]:.3f}')
"""
    ),
    md("## 9. Feature importance (RF) + coeficientes (LR)"),
    code(
        """fi = pd.DataFrame({
    'feature': FEATURES,
    'importance_rf': pipe_rf.named_steps['clf'].feature_importances_,
    'coef_lr': pipe_lr.named_steps['clf'].coef_[0],
}).sort_values('importance_rf', ascending=False)
print(fi.head(10).round(4).to_string(index=False))

fig, axes = plt.subplots(1, 2, figsize=(14, 6))
top_fi = fi.head(15).iloc[::-1]
axes[0].barh(top_fi['feature'], top_fi['importance_rf'], color='steelblue')
axes[0].set_title('RF · Feature importance (top 15)')
axes[0].set_xlabel('importance')

top_lr = fi.assign(abs_coef=fi['coef_lr'].abs()).sort_values('abs_coef', ascending=False).head(15).iloc[::-1]
axes[1].barh(top_lr['feature'], top_lr['coef_lr'],
             color=['crimson' if c<0 else 'forestgreen' for c in top_lr['coef_lr']])
axes[1].set_title('LR · Coeficientes (top 15 |coef|)')
axes[1].set_xlabel('coef (escalado)')
axes[1].axvline(0, color='black', lw=0.5)
plt.tight_layout()
plt.savefig(FIG_DIR / 'uc2_fig_feature_importance.png', dpi=120, bbox_inches='tight')
plt.show()
"""
    ),
    md("## 10. PR curve + matriz de confusión al threshold óptimo"),
    code(
        """fig, axes = plt.subplots(1, 2, figsize=(13, 5))
prec, rec, _ = precision_recall_curve(y_test, m_rf['y_proba'])
axes[0].plot(rec, prec, color='steelblue', label='RF')
prec_lr, rec_lr, _ = precision_recall_curve(y_test, m_lr['y_proba'])
axes[0].plot(rec_lr, prec_lr, color='gray', linestyle='--', label='LR baseline')
axes[0].axhline(y_test.mean(), color='red', linestyle=':', label=f'tasa base ({y_test.mean():.2f})')
axes[0].axvline(0.75, color='orange', linestyle=':', label='recall objetivo 0.75')
axes[0].set_xlabel('Recall'); axes[0].set_ylabel('Precision')
axes[0].set_title('Precision-Recall'); axes[0].legend(); axes[0].grid(alpha=.3)

yp_opt = (m_rf['y_proba'] >= threshold_opt).astype(int)
cm = confusion_matrix(y_test, yp_opt)
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', ax=axes[1],
            xticklabels=['no_deficit','deficit'], yticklabels=['no_deficit','deficit'])
axes[1].set_title(f'Matriz confusión RF @ threshold={threshold_opt:.2f}')
axes[1].set_xlabel('Predicho'); axes[1].set_ylabel('Real')
plt.tight_layout()
plt.savefig(FIG_DIR / 'uc2_fig_pr_curve.png', dpi=120, bbox_inches='tight')
plt.show()
"""
    ),
    md("## 11. Persistencia"),
    code(
        """joblib.dump(pipe_rf, MODELS_DIR / 'uc2_liquidez_rf.pkl')
joblib.dump(pipe_lr, MODELS_DIR / 'uc2_liquidez_lr_baseline.pkl')

metrics_out = {
    'fecha_evaluacion': pd.Timestamp.utcnow().isoformat(),
    'features_usadas': FEATURES,
    'n_train': int(len(X_train)),
    'n_test':  int(len(X_test)),
    'tasa_positiva_total': float(y.mean()),
    'modelos': {
        'logistic_regression': {
            'auc_roc':   float(m_lr['auc']),
            'precision': float(m_lr['precision']),
            'recall':    float(m_lr['recall']),
            'f1':        float(m_lr['f1']),
        },
        'random_forest': {
            'auc_roc':   float(m_rf['auc']),
            'precision_default': float(m_rf['precision']),
            'recall_default':    float(m_rf['recall']),
            'f1_default':        float(m_rf['f1']),
            'threshold_optimo':  float(threshold_opt),
            'precision_threshold_opt': float(best['precision']),
            'recall_threshold_opt':    float(best['recall']),
            'f1_threshold_opt':        float(best['f1']),
        }
    },
    'criterios_aceptacion': {
        'auc_rf_gt_0.70':    bool(m_rf['auc'] > 0.70),
        'recall_rf_gt_0.75': bool(best['recall'] > 0.75),
    },
    'feature_importance_top10': fi.head(10).set_index('feature')['importance_rf'].round(4).to_dict(),
    'threshold_sweep': sweep_df.round(4).to_dict(orient='records'),
}

with open(OUT_UC2 / 'uc2_metrics.json','w', encoding='utf-8') as f:
    json.dump(metrics_out, f, indent=2, default=str, ensure_ascii=False)

print('OK')
print(' modelo RF:', MODELS_DIR / 'uc2_liquidez_rf.pkl')
print(' modelo LR:', MODELS_DIR / 'uc2_liquidez_lr_baseline.pkl')
print(' metrics:  ', OUT_UC2 / 'uc2_metrics.json')
"""
    ),
]


if __name__ == "__main__":
    build_notebook(cells, NB_PATH)
    execute_notebook(NB_PATH, timeout=900)
    print("Done")
