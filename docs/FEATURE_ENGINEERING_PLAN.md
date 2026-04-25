# Feature Engineering Plan — datamoles

> **Estado**: EDA cerrado · Plan de Feature Engineering aprobado para arrancar.
> **Audiencia**: los 4 dueños de UC + integración.
> **Documentos relacionados**: [`findings/00_GENERAL.md`](./findings/00_GENERAL.md), [`findings/UC1`](./findings/UC1_anomalias_y_alertas.md), [`UC2`](./findings/UC2_gemelo_digital.md), [`UC3`](./findings/UC3_upselling.md), [`UC4`](./findings/UC4_conversacional.md).

---

## 0. Principios

1. **Features se persisten en `outputs/features/`** como `.parquet` (más rápido y conserva tipos).
2. **Una tabla por nivel de granularidad** (`user_id`, `transaccion_id`, `conv_id`, `(user_id, producto_candidato)`).
3. **Naming**: prefijo `feat_<bloque>_<descripcion>` (ej. `feat_txn_n_30d`, `feat_conv_intent_top`).
4. **Idempotencia**: cada notebook de FE debe poder re-ejecutarse end-to-end sin romper nada.
5. **Reusables van a `src/features/`** (a crear cuando aparezca código repetido entre UCs).
6. **Cada feature documenta**: definición, fuente, ventana, default para missing.

## 1. Pre-requisitos cerrados antes de FE

Lista de tareas mínimas (de los `Pendientes inmediatos` de cada UC):

| # | Tarea | Owner | Bloquea |
|---|---|---|---|
| 1 | Re-ejecutar `notebooks/eda/02_eda_clientes_dq.ipynb` y persistir outliers / correlaciones | Diego | UC2 |
| 2 | Re-ejecutar `notebooks/uc1/01_eda_rechazos.ipynb` (fix `pd.cut` bins) y persistir % de rechazos cubiertos por inversión | Fernando | UC1 |
| 3 | Re-ejecutar `notebooks/uc4/02_eda_atipicas.ipynb` con outputs guardados | Fernando | UC1 + UC4 |
| 4 | Re-ejecutar `notebooks/uc2/01_eda_patrones_gasto_mcc_bi.ipynb` con paths del repo | Brayan | UC2 |
| 5 | Re-ejecutar `notebooks/uc3/02_eda_cashback_perdido.ipynb` y `01_analisis_portafolio_productos.ipynb` | Jorge | UC3 |
| 6 | Acordar **ventana temporal** estándar: rolling `30d / 90d / all` por feature | Todos | Todos |
| 7 | Acordar **período de cierre** = **2025-11-28** (intersección con conversaciones) | Todos | UC4 |
| 8 | Crear `requirements.txt` con `uv pip freeze` (incluir sentence-transformers) | Diego | UC4 |

## 2. Estructura de notebooks de FE

A crear en cada carpeta UC:

```
notebooks/
├── uc1/
│   ├── 01_eda_rechazos.ipynb              [existente, re-ejecutar]
│   ├── 11_feature_eng_uc1_fh.ipynb        [crear]
│   └── 21_model_anomaly_uc1_fh.ipynb      [siguiente fase]
├── uc2/
│   ├── 01_eda_patrones_gasto_mcc_bi.ipynb [existente]
│   ├── 02_eda_compromisos_financieros.ipynb [existente]
│   ├── 11_feature_eng_uc2_bi.ipynb        [crear]
│   └── 21_clustering_digital_twin_bi.ipynb [siguiente fase]
├── uc3/
│   ├── 01_analisis_portafolio_productos.ipynb [existente]
│   ├── 02_eda_cashback_perdido.ipynb      [existente]
│   ├── 03_eda_cashback_perdido_jv.py      [existente]
│   ├── 11_feature_eng_uc3_jv.ipynb        [crear]
│   └── 21_model_upselling_jv.ipynb        [siguiente fase]
└── uc4/
    ├── 01_eda_conversaciones.ipynb        [existente]
    ├── 02_eda_atipicas.ipynb              [existente]
    ├── 11_feature_eng_uc4_fh.ipynb        [crear · embeddings + intents]
    └── 21_cross_dataset_uc4_jv.ipynb      [crear · cruces conv × txn]
```

Convención: **`1x_` para FE, `2x_` para modelado**. Mantener autor en sufijo (`_fh`, `_bi`, `_jv`, `_dq`).

## 3. Tabla maestra de features

### 3.1 Features universales (compartidas)
Tabla **`feat_users_master.parquet`** — granularidad: `user_id`, una fila por usuario (15,025).

| Bloque | Features | Owner |
|---|---|---|
| Demografía base | `feat_dem_*` (edad, edad_bin, sexo, estado_emb, ocupacion_emb, ingreso_log, ingreso_cuartil, antiguedad_dias, antiguedad_anios) | Diego |
| Engagement Hey | `feat_eng_*` (es_hey_pro, nomina_domiciliada, dias_desde_ultimo_login, satisfaccion, canal_apertura, preferencia_canal, usa_hey_shop) | Diego |
| Portafolio resumen | `feat_port_*` (n_productos_activos, has_<tipo_producto> one-hot, n_tarjetas_credito, tiene_inversion, saldo_inversion_log, tiene_seguro, utilizacion_pct_max) | Brayan |
| Crédito | `feat_cred_*` (score_buro, score_buro_bin, n_creditos_activos, monto_mensualidad_total) | Brayan |
| Compromisos | `feat_comp_*` (carga_fija, ratio_deuda_ingreso, ratio_decil, n_recurrentes, monto_recurrente_promedio) | Brayan |
| RFM Transaccional | `feat_txn_*` (n_tx_30d, n_tx_90d, n_tx_anual, gasto_total, ticket_avg, ticket_p90, recency_dias) | Brayan + Fernando |
| MCC mix | `feat_mcc_*` (top_categoria, share_top10_mcc, cat_diversity_shannon, spend_concentration) | Brayan |
| Tiempo | `feat_time_*` (weekend_ratio, nocturnal_ratio, peak_hour, dia_semana_top) | Brayan |
| Canal | `feat_chn_*` (share_app_ios, share_app_android, share_app_huawei, share_pos, share_codi, share_cajero) | Brayan |
| Riesgo | `feat_risk_*` (n_rechazos_anual, n_rechazos_30d, pct_atipicas, n_disputas, recibe_remesas) | Fernando |
| Conversacional | `feat_conv_*` (n_convs, n_turnos, share_voz, intent_top, pct_intent_<X>, dias_desde_ult_conv, menciona_fraude/cashback/credito, emb_user_pooling) | Fernando |

> Total ≈ 80-100 columnas. Validar correlación y dropear redundantes antes de modelado.

### 3.2 Tablas auxiliares por UC

| Tabla | Granularidad | Owner | Para |
|---|---|---|---|
| `feat_uc1_alertas.parquet` | `(user_id, transaccion_id)` | Fernando | UC1 ranker |
| `feat_uc1_user_risk.parquet` | `user_id` | Fernando | UC1 user-level |
| `feat_uc2_personas.parquet` | `user_id` | Brayan | UC2 cluster |
| `feat_uc3_candidates.parquet` | `(user_id, producto_candidato)` | Jorge | UC3 ranker |
| `feat_uc4_turns.parquet` | `(user_id, conv_id, turn_idx)` | Fernando | UC4 intent |
| `feat_uc4_convs.parquet` | `conv_id` | Fernando | UC4 conv-level |
| `feat_cross_uc1_uc4.parquet` | `user_id` | Jorge | dashboard |

## 4. Convenciones de imputación / encoding

| Tipo | Estrategia |
|---|---|
| Nulos estructurales | Filtro condicional + flag `feat_<x>_disponible` |
| Numéricos asimétricos | `log1p` + opcional StandardScaler |
| Numéricos en escala bounded (utilizacion_pct) | mantener |
| Categóricos low-cardinality (≤ 10) | one-hot |
| Categóricos high-cardinality (estado, ciudad, top_categoria) | target encoding o frequency encoding |
| Booleanos | int 0/1 |
| Fechas | derivar `dias_desde_*`, `mes`, `dia_semana`, `es_fin_de_mes` |
| Texto (input/output) | embeddings sentence-transformers, no TF-IDF |

## 5. Validación post-FE (checklist)

Cada notebook FE debe imprimir y guardar al final:

- [ ] **Shape** y dtypes finales.
- [ ] **Tasa de nulos** por feature (umbral alarma: > 30 %).
- [ ] **Correlación** entre features (heatmap de las top 30).
- [ ] **Histogramas** de las 10 features numéricas más relevantes.
- [ ] **Sanity checks** (e.g., `n_tx_30d ≤ n_tx_90d`).
- [ ] **Persist** en `outputs/features/feat_<...>.parquet`.

## 6. Cronograma sugerido

| Día | Hito |
|---|---|
| **D+1** | Cerrar pendientes de la sección 1 (re-ejecuciones) |
| **D+2** | Brayan + Diego: `feat_users_master.parquet` v1 |
| **D+3** | Fernando: `feat_uc1_*` + `feat_uc4_turns/convs` v1 |
| **D+3** | Jorge: `feat_uc3_candidates.parquet` v1 |
| **D+4** | Validación cruzada (todos consumen `feat_users_master`) |
| **D+5** | Arranque de modelado por UC |

## 7. Riesgos a vigilar durante FE

1. **Leakage temporal**: no usar txn de una fecha posterior al evento target (importante en UC1 y UC3).
2. **Leakage de UC2 → UC1/UC3**: si la persona financiera se entrena con productos contratados, no usarla como feature en UC3.
3. **Class imbalance** en UC1 (3.3 % rechazos) y UC3 (penetración baja en muchos productos): planear `class_weight` o muestreo.
4. **Costo computacional** de embeddings UC4 sobre 49,999 turnos: hacer batch size 64 + cache.
5. **Inconsistencias de fechas** entre archivos (ya documentado en 00_GENERAL §1): alinear al período común.

## 8. Definition of Done de la fase FE

- ✅ Todas las tablas `feat_*.parquet` generadas y versionadas en `outputs/features/`.
- ✅ Cada UC tiene su notebook `1x_feature_eng_<uc>_<initials>.ipynb` reproducible.
- ✅ `docs/findings/` actualizado con métricas reales post re-ejecución.
- ✅ `feat_users_master.parquet` consumido sin error por al menos 2 UCs.
- ✅ README.md raíz actualizado con la nueva ruta de outputs.
