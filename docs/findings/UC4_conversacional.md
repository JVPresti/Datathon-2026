# UC4 · Inteligencia Conversacional — Findings

> **Owners**: Fernando Haro (FE & modelado) + Jorge Vázquez (integración & demo).
> **Output esperado**: taxonomía de intents + insights cruzados conversaciones × transacciones.
> **Fuentes**: `notebooks/uc4/01_eda_conversaciones.ipynb`, `notebooks/uc4/02_eda_atipicas.ipynb`, `notebooks/eda/00_eda_unificado_dq.ipynb`.

---

## 1. Universo conversacional

| Métrica | Valor |
|---|---:|
| Filas (turnos) | **49,999** |
| Conversaciones únicas (`conv_id`) | **24,119** |
| Usuarios únicos (`user_id`) | **15,025** = 100 % de la base de clientes |
| Período | 2025-01-07 → 2025-11-28 |
| Duplicados a remover | 18 |
| `channel_source = "1"` (texto) | 46,936 (**93.9 %**) |
| `channel_source = "2"` (voz) | 3,063 (**6.1 %**) |
| Conversaciones de **1 turno** | **15,000** (62 %) |
| Turnos / conv (media · max) | 2.07 · 21 |

### 1.1 Forma de la distribución de turnos

| Turnos | # Conversaciones |
|---:|---:|
| 1 | 15,000 |
| 3 | 4,987 |
| 4 | 2,329 |
| 5 | 979 |
| 6 | 438 |
| 7 | 189 |
| 8+ | 197 |

> 🔑 La **mayoría son single-turn** → no es un dataset de chats largos; es más bien preguntas concretas. Implicación: usar embeddings por turno + agregación por usuario; el modelado de "conversación" pesa menos.

## 2. Hallazgos sobre intents (heurística inicial) ⚠️

> Notebook fuente: `notebooks/uc4/01_eda_conversaciones.ipynb`. Output ya persistido: `outputs/uc4_intent_taxonomy.json`.

### 2.1 Taxonomía heurística (rule-based, baseline)
El notebook clasifica cada `input` con keywords:

| Intent | Keywords ejemplo |
|---|---|
| `consulta_saldo` | "saldo", "cuanto tengo", "disponible" |
| `problema_transaccion` | "no me pasó", "rechazo", "no se hizo" |
| `reporte_fraude` | "fraude", "no reconozco", "desconozco" |
| `pregunta_beneficios` | "cashback", "hey pro", "beneficios" |
| `solicitud_producto` | "tarjeta", "crédito", "préstamo", "inversión" |
| `soporte_tecnico` | "no funciona", "error", "app" |
| `otro` | resto |

### 2.2 Limitaciones del baseline
- Alta precisión, **baja recall** (deja mucho en `otro`).
- Reemplazar por **embeddings + clusterización + few-shot LLM** en feature eng.
- KPIs heurísticos (% por intent, peak hour, top words) **ya están en el JSON**.

### 2.3 Cruces ya planteados
- intent × `es_hey_pro`
- intent × `canal` (texto/voz)
- intent × `edad_bin`
- intent × `patron_uso_atipico`

## 3. Hallazgos sobre transacciones atípicas (input cruzado) ⚠️

> Notebook fuente: `notebooks/uc4/02_eda_atipicas.ipynb`. **Outputs vacíos en disco** — métricas siguientes son del análisis general más hipótesis del autor.

| Señal | Valor |
|---|---:|
| `patron_uso_atipico = True` (txn) | 41,492 (5.17 %) |
| `patron_uso_atipico = True` (user) | 763 (5.1 %) |
| `es_internacional = True` | 4.99 % |
| 1,936 turnos con keywords `mensualidad/pago automático/suscripción` | confirmado |
| Turnos con keywords `fraude/cargo no reconocido/desconozco` | TBD (re-run) |

### 3.1 Hipótesis cruzadas para validar 🧪
- **H1**: usuarios con `patron_uso_atipico = True` envían **más mensajes** a Havi (mayor turnos/usuario).
- **H2**: fracción no trivial de usuarios atípicos **mencionan fraude** en el parquet → label proxy para detector de fraude conversacional.
- **H3**: peak hour de conversaciones coincide con peak hour de rechazos UC1 → patrón de "rechazo → chat".
- **H4**: conversaciones de **voz** (`channel_source=2`) tienen mayor share de `reporte_fraude` o `soporte_tecnico` (situaciones críticas).

## 4. Hallazgos sobre comportamiento temporal ✅

> Series temporales de conversaciones × hora × día generadas en `01_eda_conversaciones.ipynb` (heatmap hora × día).

- Período activo: 11 meses (enero-noviembre 2025).
- Heatmap producido pero números específicos requieren re-run para citarlos.

## 5. Cohorte canónica para UC4

```python
users_for_uc4 = clientes[clientes["user_id"].isin(convs["user_id"])]["user_id"]
# 15,025 usuarios — 100% intersección
```

Significa que **todo cliente tiene al menos una conversación**. Esto facilita los joins:

| Join | Filas resultado |
|---|---:|
| `convs ⨯ clientes` | 49,999 (sin pérdida) |
| `convs ⨯ ult_30d_txn(user)` | 49,999 (todos los users tienen txn) |
| `convs.groupby(user) ⨯ clientes` | 15,025 perfiles enriquecidos con conv |

## 6. Implicaciones para Feature Engineering

### 6.1 Features a nivel **turno** (input/output)

| Feature | Descripción |
|---|---|
| `feat_input_len_chars` | longitud raw |
| `feat_input_len_tokens` | tokens (tokenizer simple o XLM-R) |
| `feat_input_emb_<384>` | embedding sentence-transformers (multilingual) |
| `feat_intent_baseline` | clase del rule-based |
| `feat_intent_topic_kmeans` | cluster del embedding |
| `feat_sentiment_pol` | polaridad (-1, 1) |
| `feat_has_keyword_<X>` | flags por keyword crítica |
| `feat_is_voz` | `channel_source == "2"` |
| `feat_hora_dia` · `feat_dia_semana` | de `date` |

### 6.2 Features a nivel **conversación** (`conv_id`)

| Feature | Descripción |
|---|---|
| `feat_n_turnos` | conteo |
| `feat_intent_dominante` | mode de intents en la conv |
| `feat_intents_diversidad` | nunique intents en la conv |
| `feat_dur_conv_min` | (max date − min date) en min, por conv |
| `feat_emb_pooling` | mean pooling de embeddings |

### 6.3 Features a nivel **usuario** (15,025 filas)

| Feature | Descripción |
|---|---|
| `feat_n_convs_total` | conteo |
| `feat_n_turnos_total` | conteo |
| `feat_share_voz` | share canal voz |
| `feat_intent_top` | mode usuario |
| `feat_pct_intent_<X>` | share por intent |
| `feat_n_intents_unicas` | diversidad |
| `feat_dias_desde_ult_conv` | recency |
| `feat_n_convs_30d/90d` | actividad reciente |
| `feat_emb_user_pooling` | mean de embeddings de sus turnos |
| `feat_menciona_fraude` | bool any |
| `feat_menciona_cashback` | bool any |
| `feat_menciona_credito` | bool any |
| `feat_n_keywords_uc1` | total mensajes con keywords UC1 |

### 6.4 Cruces conversación × transacción (entregable diferenciador)

| Cruce | Definición | Para qué UC |
|---|---|---|
| `users_que_pregunta_post_rechazo_24h` | tienen txn `no_procesada` y conv en las próximas 24h | UC1 |
| `users_que_mencionan_fraude_y_son_atipicos` | `feat_menciona_fraude AND patron_uso_atipico_user` | UC1 |
| `users_que_mencionan_cashback_y_no_son_pro` | feature directa | UC3 |
| `users_que_mencionan_inversion_y_no_la_tienen` | feature directa | UC3 |
| `corr(intent_volume_x_dia, txn_volume_x_dia)` | series correlacionadas | dashboard |

## 7. Modelos sugeridos

| Modelo | Tipo | Output |
|---|---|---|
| **Intent classifier** | XLM-RoBERTa fine-tuned o embeddings + LR / SVM | label de intent |
| **Sentiment** | LM cargado (e.g., `pysentimiento/robertuito-sentiment`) | -1/0/+1 |
| **Topic discovery** | BERTopic sobre embeddings | clusters interpretables |
| **Cross-signal** | regresión correlacionando frecuencia de intent con KPIs txn | insights de dashboard |

## 8. Outputs esperados

```json
{
  "intent_taxonomy": {
    "consulta_saldo": {"n": 8230, "pct": 16.5, "top_words": ["saldo","cuenta",...]},
    "problema_transaccion": {...},
    ...
  },
  "user_profile_conversational": {
    "USR-00042": {
      "n_convs": 4,
      "n_turnos": 9,
      "intent_top": "pregunta_beneficios",
      "pct_voz": 0.0,
      "menciona_fraude": false,
      "menciona_cashback": true,
      "ult_intent": "solicitud_producto"
    }
  },
  "cross_insights": [
    "El 68% de los usuarios que escriben sobre 'rechazo' lo hicieron en las 24h posteriores a una transacción no_procesada.",
    "Hey Pro users: 3.2x más conversaciones sobre 'beneficios' que no-Pro.",
    "Voz se usa 1.7x más para 'reporte_fraude' que texto."
  ]
}
```

## 9. Pendientes inmediatos antes de Feature Eng

- [ ] **Re-ejecutar** `notebooks/uc4/02_eda_atipicas.ipynb` con outputs guardados.
- [ ] **Decidir** modelo de embeddings (recomendado: `paraphrase-multilingual-MiniLM-L12-v2` por costo/calidad).
- [ ] **Validar** las 4 hipótesis (H1-H4) con el dataset.
- [ ] **Acordar** con UC1 y UC3 las keywords/intents que serán features compartidas.
- [ ] **Deduplicar** las 18 filas duplicadas en el parquet.
- [ ] **Normalizar encoding** (`\ufffd`) antes de tokenizar.
