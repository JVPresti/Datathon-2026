"""Build and execute notebooks/uc4/22_model_iso_forest_uc4_fh.ipynb.

UC4 IsolationForest:
- Train on tipo_operacion='compra' & estatus='completada'
- Split temporal: <2025-10-01 train, >= 2025-10-01 test
- contamination=0.05, n_estimators=200
- Pseudo-validate against patron_uso_atipico
- Compare against rule-based anomaly_score >= 5
- Persist uc4_iso_forest.pkl + metrics + comparison CSV + figures
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from _nb_helper import build_notebook, code, execute_notebook, md  # noqa: E402

NB_PATH = ROOT / "notebooks" / "uc4" / "22_model_iso_forest_uc4_fh.ipynb"


cells = [
    md(
        """# UC4 — Modelado: IsolationForest para detección de anomalías transaccionales

**Autor:** Fernando Haro (`fh`)
**Proyecto:** datamoles — Havi
**Tipo:** No-supervisado (Isolation Forest)
**Comparación:** Modelo ML vs reglas heurísticas (`anomaly_score`)

## Objetivo

Detectar transacciones anómalas en tiempo real con menor tasa de falsos positivos
que las reglas heurísticas, manteniendo recall razonable contra `patron_uso_atipico`
(la etiqueta sintética del dataset, usada como pseudo-validación).
"""
    ),
    md("---\n## 0. Setup"),
    code(
        """import pandas as pd
import numpy as np
import json, joblib, warnings
from pathlib import Path
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.ensemble import IsolationForest
from sklearn.metrics import (classification_report, precision_score, recall_score,
                             f1_score, confusion_matrix, roc_auc_score)

warnings.filterwarnings('ignore')

ROOT = Path('..').resolve().parent
FEAT_DIR  = ROOT / 'outputs' / 'features'
OUT_UC4   = ROOT / 'outputs' / 'uc4'
MODELS    = ROOT / 'outputs' / 'models'
FIG_DIR   = ROOT / 'notebooks' / 'uc4'
OUT_UC4.mkdir(parents=True, exist_ok=True)
MODELS.mkdir(parents=True, exist_ok=True)

CONTAMINATION = 0.05
N_ESTIMATORS = 200
RANDOM_STATE = 42
SPLIT_DATE = pd.Timestamp('2025-10-01')
RULE_THRESHOLD = 5  # anomaly_score >= 5 → la regla considera anomalía
"""
    ),
    md("## 1. Carga + filtrado a `compra`/`completada`"),
    code(
        """df = pd.read_parquet(FEAT_DIR / 'feat_uc4_txn_profile.parquet')
print('Total raw:', df.shape)

mask = (df['tipo_operacion']=='compra') & (df['estatus']=='completada')
df = df[mask].copy()
print('Filtered (compra + completada):', df.shape)

# Bool → int
for c in ['es_internacional','ciudad_nueva','sig_internacional','sig_hora_atipica',
          'sig_ciudad_nueva','sig_monto_extremo','sig_reintento','patron_uso_atipico']:
    if c in df.columns:
        df[c] = df[c].fillna(False).astype(int)

# Manejo de NaN en los z_* y perfil_* (cuando std==0)
for c in ['z_monto','z_hora','perfil_pct_internacional','perfil_n_txn',
          'perfil_monto_std','perfil_hora_std','intento_numero']:
    df[c] = df[c].fillna(0.0)
print('NaN restantes en columnas modelo:',
      df[['z_monto','z_hora','es_internacional','ciudad_nueva','intento_numero',
          'sig_internacional','sig_hora_atipica','sig_ciudad_nueva','sig_monto_extremo',
          'sig_reintento','perfil_pct_internacional','perfil_n_txn',
          'perfil_monto_std','perfil_hora_std']].isna().sum().sum())
"""
    ),
    md("## 2. Split temporal"),
    code(
        """df = df.sort_values('fecha_hora').reset_index(drop=True)
df_train = df[df['fecha_hora'] <  SPLIT_DATE].copy()
df_test  = df[df['fecha_hora'] >= SPLIT_DATE].copy()
print(f'Train: {df_train.shape[0]:,} | Test: {df_test.shape[0]:,}')
print(f'Train range: {df_train.fecha_hora.min().date()} → {df_train.fecha_hora.max().date()}')
print(f'Test range : {df_test.fecha_hora.min().date()} → {df_test.fecha_hora.max().date()}')
print(f'Tasa de patron_uso_atipico — train: {df_train["patron_uso_atipico"].mean():.3%}  test: {df_test["patron_uso_atipico"].mean():.3%}')
"""
    ),
    md("## 3. Entrenamiento del IsolationForest"),
    code(
        """FEATURES = [
    'z_monto','z_hora','es_internacional','ciudad_nueva','intento_numero',
    'sig_internacional','sig_hora_atipica','sig_ciudad_nueva','sig_monto_extremo','sig_reintento',
    'perfil_pct_internacional','perfil_n_txn','perfil_monto_std','perfil_hora_std',
]
X_train = df_train[FEATURES].values
X_test  = df_test[FEATURES].values
y_train = df_train['patron_uso_atipico'].values
y_test  = df_test['patron_uso_atipico'].values

iso = IsolationForest(
    contamination=CONTAMINATION,
    n_estimators=N_ESTIMATORS,
    random_state=RANDOM_STATE,
    n_jobs=-1,
)
iso.fit(X_train)
print('Modelo entrenado.')
"""
    ),
    md("## 4. Predicción + score sobre el test"),
    code(
        """df_test['iso_anomaly_score'] = -iso.score_samples(X_test)  # mayor = más anómalo
df_test['iso_is_anomaly'] = (iso.predict(X_test) == -1).astype(int)

print(f'Iso anomaly rate test: {df_test["iso_is_anomaly"].mean():.3%}')
print(f'patron_uso_atipico    : {y_test.mean():.3%}')
print(f'Reglas (anomaly_score>={RULE_THRESHOLD}): {(df_test["anomaly_score"]>=RULE_THRESHOLD).mean():.3%}')
"""
    ),
    md("## 5. Pseudo-validación contra `patron_uso_atipico`"),
    code(
        """y_pred = df_test['iso_is_anomaly'].values

print('=== Iso Forest vs patron_uso_atipico ===')
print(classification_report(y_test, y_pred, digits=3))

prec = precision_score(y_test, y_pred, zero_division=0)
rec  = recall_score(y_test, y_pred, zero_division=0)
f1   = f1_score(y_test, y_pred, zero_division=0)
auc  = roc_auc_score(y_test, df_test['iso_anomaly_score'].values)
print(f'AUC-ROC (sobre score): {auc:.3f}')
"""
    ),
    md("## 6. Comparativa contra reglas (`anomaly_score >= 5`)"),
    code(
        """rule_pred = (df_test['anomaly_score'] >= RULE_THRESHOLD).astype(int).values

prec_r = precision_score(y_test, rule_pred, zero_division=0)
rec_r  = recall_score(y_test, rule_pred, zero_division=0)
f1_r   = f1_score(y_test, rule_pred, zero_division=0)

# FP rate definido como: alertas que NO son anomalía verdadera / total negativos
n_negativos = int((y_test==0).sum())
fp_iso  = int(((y_pred==1)    & (y_test==0)).sum())
fp_rule = int(((rule_pred==1) & (y_test==0)).sum())
fp_rate_iso  = fp_iso  / n_negativos if n_negativos else 0
fp_rate_rule = fp_rule / n_negativos if n_negativos else 0
reduccion_fp_pct = (1 - fp_rate_iso/fp_rate_rule)*100 if fp_rate_rule > 0 else 0.0

cmp = pd.DataFrame({
    'modelo':       ['IsoForest', 'Regla heurística'],
    'precision':    [prec, prec_r],
    'recall':       [rec, rec_r],
    'f1':           [f1, f1_r],
    'fp_rate':      [fp_rate_iso, fp_rate_rule],
    'n_alertas':    [int(y_pred.sum()), int(rule_pred.sum())],
})
print(cmp.round(4).to_string(index=False))
print(f'\\nReducción de FP del modelo vs reglas: {reduccion_fp_pct:+.1f}%')
"""
    ),
    md("## 7. Sweep de threshold sobre `iso_anomaly_score`"),
    code(
        """sweep = []
for q in [0.85, 0.90, 0.93, 0.95, 0.97, 0.99]:
    th = float(np.quantile(df_test['iso_anomaly_score'], q))
    yp = (df_test['iso_anomaly_score'] >= th).astype(int).values
    sweep.append({
        'percentil_score': q,
        'threshold': th,
        'precision': precision_score(y_test, yp, zero_division=0),
        'recall':    recall_score(y_test, yp, zero_division=0),
        'f1':        f1_score(y_test, yp, zero_division=0),
        'n_alertas': int(yp.sum()),
    })
sweep_df = pd.DataFrame(sweep)
print(sweep_df.round(4).to_string(index=False))

fig, ax = plt.subplots(figsize=(9, 5))
ax.plot(sweep_df['percentil_score'], sweep_df['precision'], marker='o', label='precision')
ax.plot(sweep_df['percentil_score'], sweep_df['recall'],    marker='s', label='recall')
ax.plot(sweep_df['percentil_score'], sweep_df['f1'],         marker='^', label='F1')
ax.set_xlabel('Percentil del iso_anomaly_score')
ax.set_ylabel('Score')
ax.set_title('UC4 — Threshold sweep IsoForest')
ax.legend(); ax.grid(alpha=.3)
plt.tight_layout()
plt.savefig(FIG_DIR / 'uc4_fig_iso_threshold_sweep.png', dpi=120, bbox_inches='tight')
plt.show()
"""
    ),
    md("## 8. Matriz de confusión: IsoForest vs Reglas"),
    code(
        """cm_iso = confusion_matrix(y_test, y_pred)
cm_rule = confusion_matrix(y_test, rule_pred)
fig, axes = plt.subplots(1, 2, figsize=(12, 5))
sns.heatmap(cm_iso,  annot=True, fmt='d', cmap='Blues',  ax=axes[0],
            xticklabels=['normal','anomalía'], yticklabels=['normal','anomalía'])
axes[0].set_title(f'IsoForest @ contamination={CONTAMINATION}')
axes[0].set_xlabel('predicho'); axes[0].set_ylabel('real (patron_uso_atipico)')

sns.heatmap(cm_rule, annot=True, fmt='d', cmap='Oranges', ax=axes[1],
            xticklabels=['normal','anomalía'], yticklabels=['normal','anomalía'])
axes[1].set_title(f'Regla heurística @ anomaly_score>={RULE_THRESHOLD}')
axes[1].set_xlabel('predicho'); axes[1].set_ylabel('real (patron_uso_atipico)')
plt.tight_layout()
plt.savefig(FIG_DIR / 'uc4_fig_iso_vs_rules_confusion.png', dpi=120, bbox_inches='tight')
plt.show()
"""
    ),
    md("## 9. Casos donde modelo y reglas discrepan"),
    code(
        """df_test['rule_is_anomaly'] = rule_pred
discrepa = df_test[df_test['iso_is_anomaly'] != df_test['rule_is_anomaly']].copy()
print(f'Discrepancias totales: {len(discrepa):,} de {len(df_test):,}  ({len(discrepa)/len(df_test):.1%})')
print(f'  Solo iso detecta : {int(((discrepa["iso_is_anomaly"]==1)&(discrepa["rule_is_anomaly"]==0)).sum()):,}')
print(f'  Solo rule detecta: {int(((discrepa["iso_is_anomaly"]==0)&(discrepa["rule_is_anomaly"]==1)).sum()):,}')

sample_cols = ['transaccion_id','user_id','fecha_hora','monto','hora_del_dia','es_internacional',
               'ciudad_nueva','intento_numero','anomaly_score','iso_anomaly_score',
               'iso_is_anomaly','rule_is_anomaly','patron_uso_atipico']
sample = discrepa.sample(min(200, len(discrepa)), random_state=42)[sample_cols].sort_values('iso_anomaly_score', ascending=False)
sample.to_csv(OUT_UC4 / 'uc4_iso_vs_rules_comparison.csv', index=False)
print('Wrote', OUT_UC4 / 'uc4_iso_vs_rules_comparison.csv')
sample.head(10)
"""
    ),
    md("## 10. Persistencia"),
    code(
        """joblib.dump(iso, MODELS / 'uc4_iso_forest.pkl')
print('Modelo guardado:', MODELS / 'uc4_iso_forest.pkl')

metrics = {
    'fecha_evaluacion': pd.Timestamp.utcnow().isoformat(),
    'features_modelo': FEATURES,
    'split': {
        'fecha_corte': SPLIT_DATE.isoformat(),
        'n_train': int(len(df_train)),
        'n_test': int(len(df_test)),
        'tasa_patron_atipico_test': float(y_test.mean()),
    },
    'modelo': {
        'tipo': 'IsolationForest',
        'contamination': CONTAMINATION,
        'n_estimators': N_ESTIMATORS,
        'precision': float(prec),
        'recall':    float(rec),
        'f1':        float(f1),
        'auc_roc_score': float(auc),
        'n_anomalias_detectadas': int(y_pred.sum()),
    },
    'reglas_baseline': {
        'umbral_anomaly_score': RULE_THRESHOLD,
        'precision': float(prec_r),
        'recall':    float(rec_r),
        'f1':        float(f1_r),
        'n_anomalias_detectadas': int(rule_pred.sum()),
    },
    'comparativa_fp': {
        'fp_rate_modelo': float(fp_rate_iso),
        'fp_rate_reglas': float(fp_rate_rule),
        'reduccion_fp_pct': float(reduccion_fp_pct),
    },
    'threshold_sweep': sweep_df.round(4).to_dict(orient='records'),
    'criterios_aceptacion': {
        'precision_gt_0.7_vs_patron': bool(prec > 0.7),
        'reduccion_fp_reportada': True,
        'modelo_persistido': True,
    },
    'limitacion': 'patron_uso_atipico es etiqueta sintética del dataset, no fraude real. Métricas son pseudo-validación.',
}
with open(OUT_UC4 / 'uc4_iso_forest_metrics.json','w', encoding='utf-8') as f:
    json.dump(metrics, f, indent=2, default=str, ensure_ascii=False)
print('Wrote', OUT_UC4 / 'uc4_iso_forest_metrics.json')
"""
    ),
]


if __name__ == "__main__":
    build_notebook(cells, NB_PATH)
    execute_notebook(NB_PATH, timeout=900)
    print("Done")
