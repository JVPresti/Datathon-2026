# datamoles · Hey Datathon 2026

> **Producto**: **Havi** — copiloto financiero proactivo con IA para usuarios de Hey Banco.
> **Equipo**: Diego Quiros (DS Lead) · Fernando Haro · Brayan Ivan · Jorge Vázquez.
> **Fase actual**: ✅ EDA cerrado · 🚧 Feature Engineering arrancando.

---

## TL;DR

Tenemos 4 datasets (15,025 clientes · 38,909 productos · 802,384 transacciones · 49,999 conversaciones) limpios, con **integridad referencial 100 %** y un mapa claro de calidad de datos. Sobre eso construimos 4 casos de uso:

| UC | Qué hace | Quién lo lidera |
|---|---|---|
| **UC1** | Asistente Financiero Proactivo (alertas) | Fernando |
| **UC2** | Gemelo Digital (perfil conductual) | Brayan |
| **UC3** | Upselling Inteligente (recomendaciones) | Jorge |
| **UC4** | Inteligencia Conversacional (intents + cruces) | Fernando + Jorge |

Los hallazgos por UC y el plan de features están en [`docs/`](./docs).

## Estructura del repo

```text
Datathon-2026/
├── README.md                           ← estás acá
├── .gitignore
│
├── docs/                               ← toda la documentación
│   ├── CONTEXT.md                      project brief + setup
│   ├── DATA_CONTEXT.md                 esquema técnico de los 4 datasets
│   ├── FEATURE_ENGINEERING_PLAN.md     bridge a la próxima fase
│   └── findings/
│       ├── README.md                   índice de findings
│       ├── 00_GENERAL.md               foto integral + DQ + métricas globales
│       ├── UC1_anomalias_y_alertas.md
│       ├── UC2_gemelo_digital.md
│       ├── UC3_upselling.md
│       └── UC4_conversacional.md
│
├── notebooks/
│   ├── eda/                            EDA transversal por dataset
│   │   ├── 00_eda_unificado_dq.ipynb
│   │   ├── 01_eda_carga_datos.ipynb
│   │   ├── 02_eda_clientes_dq.ipynb
│   │   └── 03_eda_transacciones_dq.ipynb
│   ├── uc1/
│   │   └── 01_eda_rechazos.ipynb
│   ├── uc2/
│   │   ├── 01_eda_patrones_gasto_mcc_bi.ipynb
│   │   └── 02_eda_compromisos_financieros.ipynb
│   ├── uc3/
│   │   ├── 01_analisis_portafolio_productos.ipynb
│   │   ├── 02_eda_cashback_perdido.ipynb
│   │   └── 03_eda_cashback_perdido_jv.py
│   └── uc4/
│       ├── 01_eda_conversaciones.ipynb
│       └── 02_eda_atipicas.ipynb
│
├── outputs/                            artefactos generados
│   └── uc3_cashback_perdido.csv
│
├── Datathon_Hey_2026_dataset_transacciones 1/
│   └── dataset_transacciones/
│       ├── DICCIONARIO_DATOS.md
│       ├── DICCIONARIO_DATOS.pdf
│       ├── hey_clientes.csv
│       ├── hey_productos.csv
│       └── hey_transacciones.csv      [no versionado: pesa 142 MB]
│
└── Datathon_Hey_dataset_conversaciones 1/
    └── dataset_conversaciones/
        ├── README.md
        ├── dataset_50k_anonymized.csv
        └── dataset_50k_anonymized.parquet
```

## Cómo navegar

| Si querés... | Andá a... |
|---|---|
| **Entender el proyecto y montar el entorno** | [`docs/CONTEXT.md`](./docs/CONTEXT.md) |
| **Conocer el esquema de los datasets** | [`docs/DATA_CONTEXT.md`](./docs/DATA_CONTEXT.md) |
| **Ver el resumen ejecutivo del EDA** | [`docs/findings/00_GENERAL.md`](./docs/findings/00_GENERAL.md) |
| **Ver hallazgos de un UC específico** | [`docs/findings/UC<n>_*.md`](./docs/findings/) |
| **Empezar a hacer features** | [`docs/FEATURE_ENGINEERING_PLAN.md`](./docs/FEATURE_ENGINEERING_PLAN.md) |
| **Re-ejecutar un EDA** | abrir cualquier notebook bajo `notebooks/eda/` o `notebooks/uc<n>/` |

## Setup rápido

```bash
# 1. crear venv
uv venv .venv --python 3.11
source .venv/bin/activate         # macOS/Linux
.venv\Scripts\activate            # Windows

# 2. instalar
uv pip install jupyterlab pandas polars pyarrow matplotlib seaborn \
               scikit-learn plotly xgboost lightgbm imbalanced-learn \
               scipy tqdm sentence-transformers

# 3. lanzar
jupyter lab
```

Detalle completo en [`docs/CONTEXT.md`](./docs/CONTEXT.md).

## Estado de la fase EDA

| Notebook | Estado | Pendiente |
|---|---|---|
| `notebooks/eda/00_eda_unificado_dq.ipynb` | ✅ Ejecutado (parcialmente) | Sec 7 (resumen) |
| `notebooks/eda/01_eda_carga_datos.ipynb` | ✅ Ejecutado | — |
| `notebooks/eda/02_eda_clientes_dq.ipynb` | ⚠️ Outputs vacíos | Re-ejecutar |
| `notebooks/eda/03_eda_transacciones_dq.ipynb` | ✅ Ejecutado | — |
| `notebooks/uc1/01_eda_rechazos.ipynb` | ⚠️ Bug `pd.cut` + celdas inversión sin ejecutar | Fix + re-run |
| `notebooks/uc2/01_eda_patrones_gasto_mcc_bi.ipynb` | ⚠️ Paths macOS, resumen sin ejecutar | Re-run con paths repo |
| `notebooks/uc2/02_eda_compromisos_financieros.ipynb` | ✅ Ejecutado | — |
| `notebooks/uc3/01_analisis_portafolio_productos.ipynb` | ⚠️ Outputs no persistidos | Re-run |
| `notebooks/uc3/02_eda_cashback_perdido.ipynb` | ⚠️ Falta CSV/JSON | Re-run |
| `notebooks/uc3/03_eda_cashback_perdido_jv.py` | ✅ Ejecutado, output en `outputs/` | — |
| `notebooks/uc4/01_eda_conversaciones.ipynb` | ✅ Ejecutado, JSON persistido | — |
| `notebooks/uc4/02_eda_atipicas.ipynb` | ⚠️ Outputs vacíos | Re-ejecutar |

> Lista completa de tareas para arrancar Feature Eng: [`docs/FEATURE_ENGINEERING_PLAN.md`](./docs/FEATURE_ENGINEERING_PLAN.md) §1.

## Convenciones

- **Notebooks**: `{nn}_{descripcion}_{iniciales_autor}.ipynb`. EDA: 00-09. Feature Eng: 10-19. Modelado: 20-29.
- **Variables**: `snake_case`.
- **Features**: prefijo `feat_<bloque>_<descripcion>` (ej. `feat_txn_n_30d`).
- **Outputs**: en `outputs/`, formato `.parquet` para features, `.json` para entregables, `.png` para gráficos.
- **Branches**: `feat/uc<n>-<tarea>`, `eda/<tarea>`, `fix/<...>`.
- **No commitear** `data/`, `.venv/`, `__pycache__/`, `.ipynb_checkpoints/`.

---

> Hey Banco · Datathon 2026 · Equipo datamoles
