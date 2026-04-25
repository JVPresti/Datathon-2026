# 🧠 datamoles — Contexto del Proyecto

> **Competencia:** DSC x Hey 2026 — Datathon para Hey Banco
> **Producto:** Havi — copiloto financiero proactivo con IA para usuarios de Hey Banco

---

## Objetivo del Proyecto

Havi no es un chatbot reactivo. Es un **copiloto financiero proactivo**: analiza el comportamiento transaccional del usuario, construye un perfil de él, predice qué productos le convienen y entiende qué está preguntando cuando habla. Todo esto para anticiparse a sus necesidades antes de que él mismo las articule.

El proyecto cubre cuatro casos de uso concretos:

### UC1 — Asistente Financiero Proactivo
Analiza patrones de gasto y **alerta proactivamente** al usuario sobre anomalías, riesgos presupuestarios u oportunidades de ahorro. No espera que el usuario pregunte — Havi ya lo detectó.

- **Input:** `hey_transacciones.csv` + `hey_clientes.csv`
- **Output:** JSON estructurado con `alert_type`, `message`, `priority`, `recommended_action`

### UC2 — Gemelo Digital (Digital Twin)
Construye un **perfil conductual** de cada usuario basado en su historial financiero. Este perfil alimenta la personalización del tono, las sugerencias y los objetivos financieros de Havi.

- **Input:** los 3 CSVs
- **Output:** vector de perfil de usuario + clasificación de persona financiera

### UC3 — Upselling Inteligente
Predice qué usuarios tienen **mayor probabilidad de adoptar un nuevo producto** (cuenta de ahorro, crédito, inversión). El objetivo es recomendarlo en el momento correcto, no de manera genérica.

- **Input:** `hey_transacciones.csv` + `hey_productos.csv`
- **Output:** lista rankeada de recomendaciones con score de confianza por usuario

### UC4 — Inteligencia Conversacional
Analiza las 50k conversaciones del dataset para extraer **intenciones, sentimiento y correlaciones cruzadas** con el comportamiento transaccional. ¿Los usuarios que preguntan sobre X tienden a tener el patrón de gasto Y?

- **Input:** `dataset_50k_anonymized.parquet` + datos transaccionales
- **Output:** taxonomía de intents + insights cruzados entre datasets

---

## 👥 Equipo

| Nombre | Rol | Responsabilidad principal |
|---|---|---|
| Diego Quiros | DS Lead | Todo el EDA inicial + análisis del dataset conversacional |
| Fernando Haro | DS | UC1 end-to-end + UC4 Feature Engineering & Modelado |
| Brayan Ivan | DS | UC2 Feature Eng, Modelado e Integración + Dashboard |
| Jorge Vazquez | DS | UC3 completo + UC4 Integración y Demo |

---

## 📦 Datasets

Ruta local base: `/path/to/dataton/` *(cada uno configura la suya)*

### `hey_clientes.csv`
Datos demográficos y señales de comportamiento del usuario. Es la tabla de dimensión central — casi todo join pasa por acá.

- **Join key:** `user_id` (presente en todos los datasets)
- **Columnas de interés:** edad, segmento, antigüedad, estado, indicadores de actividad

### `hey_productos.csv`
Portfolio de productos por usuario: qué tiene contratado, desde cuándo, y estado.

- **Join key:** `user_id`
- **Columnas de interés:** tipo de producto, fecha de alta, status, límites/saldos
- **Uso principal:** UC2 (perfil) y UC3 (upselling — qué tiene vs. qué podría tener)

### `hey_transacciones.csv`
Historial transaccional. Es el dataset más rico en señales de comportamiento real.

- **Join key:** `user_id`
- **Columnas de interés:** monto, categoría de gasto, comercio, fecha, tipo (cargo/abono), canal
- **Uso principal:** UC1 (anomalías), UC2 (perfil conductual), UC3 (capacidad de pago), UC4 (correlaciones)

### `dataset_50k_anonymized.parquet`
49,999 conversaciones entre usuarios y Havi. El dataset más diferencial de la competencia.

- **Join key:** `user_id` → conecta con los 3 CSVs
- **`conv_id`:** identifica conversaciones multi-turno (un usuario puede tener varias)
- **`channel_source`:** `1` = texto, `2` = voz
- **Fechas:** anonimizadas pero el **orden cronológico está preservado** — se puede usar para secuencias temporales
- **Uso principal:** UC4 (taxonomía de intents, sentiment, correlaciones con transacciones)

---

## 🏗️ Arquitectura del Pipeline

```
Raw Data
   │
   ├── hey_clientes.csv ──────────┐
   ├── hey_productos.csv ─────────┤──► EDA & Limpieza
   ├── hey_transacciones.csv ─────┤         │
   └── dataset_50k.parquet ───────┘         │
                                             ▼
                                    Feature Engineering
                                    (por UC, en notebooks separados)
                                             │
                              ┌──────────────┼──────────────┐
                              ▼              ▼              ▼
                           UC1            UC2/UC3         UC4
                        Anomaly Det.    Clustering/     NLP / Intent
                        Rule-based +    Clasificación   Classification
                        ML model        + Ranking
                              │              │              │
                              └──────────────┴──────────────┘
                                             │
                                             ▼
                                    JSON Payload / Output
                                    (formato estandarizado por UC)
                                             │
                                             ▼
                                    Integración → Demo de Havi
```

---

## ⚙️ Setup del Entorno

### Prerequisitos

- Python 3.11+
- [`uv`](https://github.com/astral-sh/uv) instalado (`pip install uv` o `curl -Ls https://astral.sh/uv/install.sh | sh`)
- JupyterLab

### Crear el entorno virtual con `uv`

```bash
# Desde la raíz del repo
uv venv .venv --python 3.11

# Activar
source .venv/bin/activate          # macOS / Linux
.venv\Scripts\activate             # Windows
```

### Instalar dependencias

```bash
uv pip install \
  jupyterlab \
  pandas \
  polars \
  pyarrow \
  matplotlib \
  seaborn \
  scikit-learn \
  plotly \
  jupyter-contrib-nbextensions \
  xgboost \
  lightgbm \
  imbalanced-learn \
  scipy \
  tqdm
```

> **Tip:** Una vez que el entorno esté estable, hacé `uv pip freeze > requirements.txt` para que todos trabajen con las mismas versiones.

### Lanzar JupyterLab

```bash
jupyter lab
```

Accedé desde el browser en `http://localhost:8888`.

### Estructura de carpetas recomendada

```
datamoles/
├── CONTEXT.md              ← este archivo
├── requirements.txt
├── .venv/                  ← no commitear
├── data/                   ← no commitear (agregar a .gitignore)
│   ├── hey_clientes.csv
│   ├── hey_productos.csv
│   ├── hey_transacciones.csv
│   └── dataset_50k_anonymized.parquet
├── notebooks/
│   ├── eda/
│   │   ├── 01_eda_clientes_dq.ipynb
│   │   ├── 02_eda_transacciones_dq.ipynb
│   │   ├── 03_eda_productos_dq.ipynb
│   │   └── 04_eda_conversaciones_dq.ipynb
│   ├── uc1/
│   │   ├── 01_feature_eng_fh.ipynb
│   │   └── 02_model_anomaly_fh.ipynb
│   ├── uc2/
│   │   ├── 01_feature_eng_bi.ipynb
│   │   └── 02_clustering_digital_twin_bi.ipynb
│   ├── uc3/
│   │   ├── 01_feature_eng_jv.ipynb
│   │   └── 02_model_upselling_jv.ipynb
│   └── uc4/
│       ├── 01_intent_extraction_fh.ipynb
│       └── 02_cross_dataset_analysis_jv.ipynb
├── src/
│   ├── features/           ← funciones reutilizables de feature eng
│   ├── models/             ← clases/wrappers de modelos
│   └── utils/              ← helpers (loaders, formatters, etc.)
└── outputs/
    ├── uc1_alerts_sample.json
    ├── uc2_profiles_sample.json
    ├── uc3_recommendations_sample.json
    └── uc4_intent_taxonomy.json
```

---

## 📐 Convenciones del Proyecto

### Nombrado de notebooks

```
{número_secuencial}_{descripción_corta}_{iniciales_autor}.ipynb
```

Ejemplos: `01_eda_clientes_dq.ipynb`, `02_model_anomaly_fh.ipynb`

### Variables y funciones en código

- **Variables:** `snake_case` — `df_transacciones`, `user_profile_vector`
- **Funciones:** `snake_case` con verbo — `load_transactions()`, `compute_rfm_features()`
- **Constantes:** `UPPER_SNAKE_CASE` — `DATA_PATH`, `TARGET_COLUMN`
- **Clases:** `PascalCase` — `UserProfileBuilder`, `AnomalyDetector`
- **Columnas derivadas:** prefijo que indique origen — `feat_avg_monthly_spend`, `target_upsell_label`

### Git workflow

```bash
# Rama por UC o por tarea
git checkout -b feat/uc1-anomaly-model
git checkout -b feat/uc2-clustering
git checkout -b eda/conversaciones

# Commits descriptivos
git commit -m "feat(uc1): add RFM features from transacciones"
git commit -m "eda: initial exploration of clientes dataset"
git commit -m "fix(uc3): handle null products in ranking"
```

- La rama `main` es para código que ya funciona y está revisado
- No commitear el directorio `data/` ni `.venv/`
- Agregar `.gitignore` con: `data/`, `.venv/`, `__pycache__/`, `.ipynb_checkpoints/`, `*.pyc`

### Outputs

Todo modelo o notebook que genera un resultado debe escribirlo en `outputs/` con el prefijo del UC correspondiente. Formato preferido: JSON para integración, CSV para análisis exploratorios.

---

## 📋 Trello Board

**URL:** [https://trello.com/b/BXNCq7bI/plan-datamoles](https://trello.com/b/BXNCq7bI/plan-datamoles)

El tablero tiene 6 listas:

| Lista | Propósito |
|---|---|
| **Backlog** | Todo lo identificado pero no empezado |
| **EDA & Exploración** | Análisis exploratorios en progreso o pendientes |
| **Feature Engineering** | Construcción de variables para los modelos |
| **Modelado** | Entrenamiento, evaluación y ajuste de modelos |
| **Integración & Demo** | Unión de piezas y preparación de la presentación |
| **Completado** | Listo y revisado |

**Convención de uso:**
- Cada tarjeta tiene un dueño asignado (ver equipo arriba)
- Mover la tarjeta cuando el estado cambia — no dejarlo en Backlog si ya arrancaste
- Si una tarea es bloqueante para otro integrante, comentarlo en la tarjeta y mencionar a esa persona

---

## 🤖 Contexto para el AI Assistant

Si estás usando Claude, Gemini, Copilot u otro asistente de IA para trabajar en este proyecto, pegá este bloque al inicio de la conversación para darle contexto completo:

```
Sos un Data Scientist trabajando en "datamoles", un proyecto para el datathon DSC x Hey 2026 de Hey Banco.

## El producto
Havi: copiloto financiero proactivo con IA para usuarios de Hey Banco.

## Los 4 casos de uso
- UC1 (Asistente Financiero Proactivo): detectar anomalías y alertar al usuario. Input: transacciones + clientes. Output: JSON con alert_type, message, priority, recommended_action.
- UC2 (Gemelo Digital): construir perfil conductual del usuario. Input: los 3 CSVs. Output: vector de perfil + clasificación de persona financiera.
- UC3 (Upselling Inteligente): predecir probabilidad de adopción de nuevo producto. Input: transacciones + productos. Output: lista rankeada con score de confianza.
- UC4 (Inteligencia Conversacional): extraer intents y sentimiento de 50k conversaciones, correlacionar con datos transaccionales. Input: parquet + transacciones. Output: taxonomía de intents + insights cruzados.

## Datasets disponibles
- hey_clientes.csv: demografía y señales de comportamiento. Join key: user_id.
- hey_productos.csv: portfolio de productos por usuario. Join key: user_id.
- hey_transacciones.csv: historial transaccional completo. Join key: user_id.
- dataset_50k_anonymized.parquet: 49,999 conversaciones. Columnas: conv_id, user_id, channel_source (1=texto, 2=voz). Fechas anonimizadas pero orden cronológico preservado. Join key: user_id.

## Stack técnico
Python 3.11, pandas, polars, scikit-learn, xgboost, lightgbm, plotly, JupyterLab.

## Lo que necesito de vos ahora
[DESCRIBÍ TU TAREA ESPECÍFICA AQUÍ — por ejemplo: "Quiero construir features RFM a partir de hey_transacciones.csv para UC1" o "Ayudame a diseñar el esquema de clustering para UC2"]
```

> Reemplazá la última línea con lo que necesitás puntualmente. Cuanto más específico, mejor respuesta vas a obtener.

---

*Última actualización: Abril 2026 — datamoles team*
