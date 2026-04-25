# Arquitectura del Pipeline de Datos — Havi

> **Audiencia**: Equipo de backend + jueces técnicos.
> **Propósito**: Documentar el flujo completo desde los CSVs de origen hasta el contexto que recibe Havi, incluyendo queries SQL, frecuencias de actualización y schemas de payloads JSON.
> **Última actualización**: Abril 2026.

---

## 1. Visión General: Flujo de Datos

```
┌──────────────────────── FUENTES (CSVs) ─────────────────────────────────┐
│                                                                          │
│  hey_clientes.csv    hey_productos.csv    hey_transacciones.csv          │
│    15,025 filas        38,909 filas          802,384 filas               │
│                                                                          │
│                  dataset_50k_anonymized.parquet                          │
│                        49,999 turnos                                     │
└─────────────────────────────┬────────────────────────────────────────────┘
                              │  ETL one-shot (carga inicial)
                              ▼
┌──────────────────────── PostgreSQL ──────────────────────────────────────┐
│                                                                          │
│  clientes (15,025)   productos (38,909)   transacciones (802,384)        │
│  conversaciones (49,999)                                                 │
│                                                                          │
│  ── Tablas de Features (actualizadas por pg_cron) ──────────────────     │
│  feat_users_master       feat_uc1_alertas                                │
│  feat_uc3_candidates     feat_uc4_convs                                  │
└──────────┬───────────────────────────────┬───────────────────────────────┘
           │ batch diario                  │ tiempo real
           │ (UC2 02:00 UTC, UC3 03:00 UTC)│ (event-driven)
           ▼                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                          FastAPI                                         │
│                                                                          │
│  GET /context/uc1/{user_id}   GET /context/uc4/{user_id}                 │
│  GET /context/uc2/{user_id}   GET /context/uc3/{user_id}                 │
│  POST /alerts/push                                                       │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │ payload JSON (ver §5)
                               ▼
┌──────────────────────── LLM Context Builder ─────────────────────────────┐
│  Ensambla prompt: perfil UC2 + alertas UC1 + recomendaciones UC3         │
│  + historial UC4 + few-shot de conversaciones                            │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │ prompt final → LLM
                               ▼
                         ┌──────────┐
                         │   Havi   │  ← Respuesta al usuario
                         └──────────┘
```

---

## 2. Schema de PostgreSQL

### 2.1 Tablas raw (de los CSVs)

```sql
-- ─── CLIENTES ──────────────────────────────────────────────────────────────────
CREATE TABLE clientes (
  user_id                 VARCHAR(20)   PRIMARY KEY,
  edad                    SMALLINT,
  sexo                    CHAR(1),
  estado                  VARCHAR(50),
  ciudad                  VARCHAR(50),
  ingreso_mensual_mxn     NUMERIC(12,2),
  score_buro              SMALLINT,
  antiguedad_dias         INTEGER,
  es_hey_pro              BOOLEAN       NOT NULL DEFAULT FALSE,
  nomina_domiciliada      BOOLEAN       NOT NULL DEFAULT FALSE,
  recibe_remesas          BOOLEAN       NOT NULL DEFAULT FALSE,
  patron_uso_atipico      BOOLEAN       NOT NULL DEFAULT FALSE,
  satisfaccion_1_10       SMALLINT,
  dias_desde_ultimo_login INTEGER,
  preferencia_canal       VARCHAR(20),
  canal_apertura          VARCHAR(20),
  nivel_educativo         VARCHAR(30),
  ocupacion               VARCHAR(50),
  idioma_preferido        VARCHAR(5),
  usa_hey_shop            BOOLEAN
);

-- ─── PRODUCTOS ─────────────────────────────────────────────────────────────────
CREATE TABLE productos (
  producto_id             VARCHAR(30)   PRIMARY KEY,
  user_id                 VARCHAR(20)   NOT NULL REFERENCES clientes(user_id),
  tipo_producto           VARCHAR(40),
  estatus                 VARCHAR(30),
  saldo_actual            NUMERIC(14,2),
  limite_credito          NUMERIC(14,2),
  utilizacion_pct         NUMERIC(5,4),
  tasa_interes_anual      NUMERIC(6,4),
  plazo_meses             SMALLINT,
  monto_mensualidad       NUMERIC(12,2)
);

-- ─── TRANSACCIONES ─────────────────────────────────────────────────────────────
CREATE TABLE transacciones (
  transaccion_id          VARCHAR(30)   PRIMARY KEY,
  user_id                 VARCHAR(20)   NOT NULL REFERENCES clientes(user_id),
  producto_id             VARCHAR(30)   REFERENCES productos(producto_id),
  fecha_hora              TIMESTAMPTZ   NOT NULL,
  monto                   NUMERIC(14,2),
  tipo_operacion          VARCHAR(30),
  estatus                 VARCHAR(20),
  categoria_mcc           VARCHAR(30),
  canal                   VARCHAR(20),
  comercio_nombre         VARCHAR(100),
  ciudad_transaccion      VARCHAR(50),
  es_internacional        BOOLEAN,
  patron_uso_atipico      BOOLEAN,
  intento_numero          SMALLINT,
  motivo_no_procesada     VARCHAR(40),
  meses_diferidos         SMALLINT,
  cashback_generado       NUMERIC(10,2),
  cargo_recurrente        BOOLEAN,
  descripcion_libre       TEXT
);

-- ─── CONVERSACIONES ────────────────────────────────────────────────────────────
CREATE TABLE conversaciones (
  conv_id                 VARCHAR(30)   NOT NULL,
  turn_idx                SMALLINT      NOT NULL,
  user_id                 VARCHAR(20)   NOT NULL REFERENCES clientes(user_id),
  date                    TIMESTAMPTZ,
  input                   TEXT,
  output                  TEXT,
  channel_source          CHAR(1),
  PRIMARY KEY (conv_id, turn_idx)
);
```

### 2.2 Índices críticos (latencia < 500 ms para UC1 y UC4)

```sql
-- Transacciones: lookup por usuario + fecha (UC1 y UC4)
CREATE INDEX idx_txn_user_fecha  ON transacciones (user_id, fecha_hora DESC);
CREATE INDEX idx_txn_estatus     ON transacciones (estatus)
  WHERE estatus IN ('no_procesada', 'en_disputa');
CREATE INDEX idx_txn_atipica     ON transacciones (user_id)
  WHERE patron_uso_atipico = TRUE;
CREATE INDEX idx_txn_recurrente  ON transacciones (user_id)
  WHERE cargo_recurrente = TRUE;

-- Productos: lookup por usuario + tipo (UC1, UC3)
CREATE INDEX idx_prod_user_tipo  ON productos (user_id, tipo_producto);
CREATE INDEX idx_prod_inversion  ON productos (user_id)
  WHERE tipo_producto = 'inversion_hey' AND estatus = 'activo';

-- Conversaciones: lookup por usuario + fecha (UC4)
CREATE INDEX idx_conv_user_date  ON conversaciones (user_id, date DESC);
```

> **Estimación**: sin índices el Q-UC1 hace full scan ~800 ms; con `idx_txn_user_fecha` + `idx_prod_inversion` baja a **80–150 ms** con buffer pool caliente.

### 2.3 Tablas de features (mantenidas por pg_cron)

```sql
-- Perfil maestro por usuario (UPDATE diario a las 02:00 UTC)
CREATE TABLE feat_users_master (
  user_id                     VARCHAR(20)   PRIMARY KEY,
  -- Demografía
  feat_dem_edad               SMALLINT,
  feat_dem_ingreso_log        NUMERIC(8,4),
  feat_dem_ingreso_cuartil    SMALLINT,
  -- Engagement Hey
  feat_eng_es_hey_pro         BOOLEAN,
  feat_eng_nomina             BOOLEAN,
  feat_eng_dias_login         INTEGER,
  -- Portafolio
  feat_port_n_productos       SMALLINT,
  feat_port_saldo_inv_log     NUMERIC(8,4),
  -- Crédito
  feat_cred_score_buro        SMALLINT,
  feat_cred_utilizacion_max   NUMERIC(5,4),
  -- Compromisos
  feat_comp_ratio_deuda       NUMERIC(6,4),
  feat_comp_carga_fija        NUMERIC(12,2),
  -- RFM transaccional
  feat_txn_n_30d              INTEGER,
  feat_txn_n_90d              INTEGER,
  feat_txn_gasto_total        NUMERIC(14,2),
  feat_txn_ticket_avg         NUMERIC(12,2),
  feat_txn_ticket_p90         NUMERIC(12,2),
  -- MCC mix
  feat_mcc_top_categoria      VARCHAR(30),
  feat_mcc_cat_diversity      SMALLINT,
  feat_mcc_weekend_ratio      NUMERIC(5,4),
  feat_mcc_nocturnal_ratio    NUMERIC(5,4),
  -- Riesgo
  feat_risk_n_rechazos_30d    INTEGER,
  feat_risk_pct_atipicas      NUMERIC(5,4),
  feat_risk_n_disputas        INTEGER,
  -- Conversacional (UC4)
  feat_conv_n_convs           INTEGER,
  feat_conv_intent_top        VARCHAR(30),
  feat_conv_menciona_fraude   BOOLEAN,
  feat_conv_menciona_cashback BOOLEAN,
  -- UC2 output
  feat_uc2_persona            VARCHAR(30),
  feat_uc2_persona_conf       NUMERIC(5,4),
  -- UC3 output
  feat_uc3_cashback_perdido   NUMERIC(10,2),
  updated_at                  TIMESTAMPTZ   DEFAULT NOW()
);

-- Alertas activas UC1 (escritura en tiempo real vía trigger)
CREATE TABLE feat_uc1_alertas (
  user_id                     VARCHAR(20)   NOT NULL,
  transaccion_id              VARCHAR(30)   NOT NULL,
  alert_type                  VARCHAR(30),
  priority                    VARCHAR(10),
  payload                     JSONB,
  created_at                  TIMESTAMPTZ   DEFAULT NOW(),
  expires_at                  TIMESTAMPTZ,
  PRIMARY KEY (user_id, transaccion_id)
);

-- Candidatos de upselling UC3 (UPDATE diario a las 03:00 UTC)
CREATE TABLE feat_uc3_candidates (
  user_id                     VARCHAR(20)   NOT NULL,
  producto_candidato          VARCHAR(40)   NOT NULL,
  score                       NUMERIC(6,4),
  expected_value_mxn          NUMERIC(12,2),
  reason                      TEXT,
  updated_at                  TIMESTAMPTZ   DEFAULT NOW(),
  PRIMARY KEY (user_id, producto_candidato)
);
```

---

## 3. Queries SQL por Caso de Uso

### UC1 — Alertas en Tiempo Real

> **Trigger**: cada INSERT en `transacciones` con `estatus = 'no_procesada'`.
> **Índices usados**: `idx_txn_user_fecha`, `idx_prod_inversion`, `idx_txn_estatus`.

```sql
-- Q-UC1: Detectar rechazos resolubles + contexto de inversión disponible
SELECT
  t.user_id,
  t.transaccion_id,
  t.monto,
  t.motivo_no_procesada,
  t.fecha_hora,
  t.tipo_operacion,
  t.categoria_mcc,
  c.es_hey_pro,
  c.satisfaccion_1_10,
  COALESCE(inv.saldo_actual, 0)                                     AS saldo_inversion,
  CASE
    WHEN COALESCE(inv.saldo_actual, 0) >= t.monto THEN TRUE
    ELSE FALSE
  END                                                               AS puede_cubrir_inversion,
  COUNT(*) OVER (
    PARTITION BY t.user_id
    ORDER BY t.fecha_hora
    ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
  )                                                                 AS n_rechazos_rolling_30d
FROM transacciones t
JOIN clientes c USING (user_id)
LEFT JOIN productos inv
  ON  inv.user_id       = t.user_id
  AND inv.tipo_producto = 'inversion_hey'
  AND inv.estatus       = 'activo'
WHERE t.estatus               = 'no_procesada'
  AND t.motivo_no_procesada   IN ('saldo_insuficiente', 'limite_excedido')
  AND t.fecha_hora            >= NOW() - INTERVAL '24 hours'
ORDER BY t.fecha_hora DESC;
```

**Latencia estimada P95**: 80–150 ms.

---

### UC2 — Gemelo Digital (batch diario)

> **Trigger**: `pg_cron` a las 02:00 UTC.
> **Output**: actualiza `feat_users_master` (15,025 filas).

```sql
-- Q-UC2: Construir vector RFM + MCC mix por usuario (ventana histórica completa)
WITH txn_base AS (
  SELECT
    t.user_id,
    t.monto,
    t.tipo_operacion,
    t.categoria_mcc,
    t.estatus,
    t.fecha_hora,
    t.patron_uso_atipico,
    EXTRACT(ISODOW FROM t.fecha_hora)  AS dia_semana,
    EXTRACT(HOUR  FROM t.fecha_hora)   AS hora_dia
  FROM transacciones t
  WHERE t.fecha_hora BETWEEN '2025-01-07' AND '2025-11-28'
)
SELECT
  user_id,
  COUNT(*)                                                           AS n_tx_anual,
  COUNT(*) FILTER (WHERE fecha_hora >= CURRENT_DATE - 30)           AS n_tx_30d,
  COUNT(*) FILTER (WHERE fecha_hora >= CURRENT_DATE - 90)           AS n_tx_90d,
  SUM(monto) FILTER (
    WHERE tipo_operacion = 'compra' AND estatus = 'completada'
  )                                                                  AS gasto_total_compras,
  AVG(monto) FILTER (
    WHERE tipo_operacion = 'compra' AND estatus = 'completada'
  )                                                                  AS ticket_avg,
  PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY monto)                AS ticket_p90,
  MODE() WITHIN GROUP (ORDER BY categoria_mcc)                      AS top_mcc,
  COUNT(DISTINCT categoria_mcc)                                      AS cat_diversity,
  SUM(CASE WHEN dia_semana IN (6, 7) THEN monto ELSE 0 END)
    / NULLIF(SUM(monto), 0)                                         AS weekend_ratio,
  SUM(CASE
    WHEN hora_dia BETWEEN 22 AND 23 OR hora_dia BETWEEN 0 AND 5
    THEN monto ELSE 0
  END) / NULLIF(SUM(monto), 0)                                      AS nocturnal_ratio,
  SUM(CASE WHEN patron_uso_atipico THEN 1 ELSE 0 END)::NUMERIC
    / NULLIF(COUNT(*), 0)                                           AS pct_atipicas,
  MAX(fecha_hora)                                                    AS last_txn_ts
FROM txn_base
GROUP BY user_id;
```

**Tiempo estimado de ejecución batch**: 8–15 s sobre 802,384 filas con índices activos.

---

### UC3 — Upselling Inteligente (batch diario)

> **Trigger**: `pg_cron` a las 03:00 UTC.
> **Output**: actualiza `feat_uc3_candidates` por usuario no-Pro.

```sql
-- Q-UC3: Cashback perdido + señales conversacionales de intención
WITH cashback_base AS (
  SELECT
    t.user_id,
    SUM(t.monto * 0.01)                                             AS cashback_perdido_mes,
    MODE() WITHIN GROUP (ORDER BY t.categoria_mcc)                  AS top_categoria_perdida,
    SUM(t.monto) FILTER (
      WHERE t.categoria_mcc = MODE() WITHIN GROUP (ORDER BY t.categoria_mcc)
    )                                                               AS monto_top_categoria,
    COUNT(*)                                                        AS n_compras_mes
  FROM transacciones t
  WHERE t.tipo_operacion  = 'compra'
    AND t.estatus         = 'completada'
    AND DATE_TRUNC('month', t.fecha_hora) =
        DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
  GROUP BY t.user_id
),
conv_signals AS (
  SELECT
    user_id,
    COUNT(*) FILTER (
      WHERE input ILIKE '%cashback%'
         OR input ILIKE '%hey pro%'
         OR input ILIKE '%beneficio%'
    )                                                               AS menciones_pro,
    COUNT(*) FILTER (
      WHERE input ILIKE '%inversion%' OR input ILIKE '%inversión%'
         OR input ILIKE '%rendimiento%'
    )                                                               AS menciones_inversion,
    COUNT(*) FILTER (
      WHERE input ILIKE '%crédito%'   OR input ILIKE '%credito%'
         OR input ILIKE '%préstamo%'
    )                                                               AS menciones_credito
  FROM conversaciones
  GROUP BY user_id
)
SELECT
  c.user_id,
  cb.cashback_perdido_mes,
  cb.top_categoria_perdida,
  cb.monto_top_categoria,
  cb.n_compras_mes,
  c.nomina_domiciliada,
  c.score_buro,
  c.ingreso_mensual_mxn,
  cs.menciones_pro,
  cs.menciones_inversion,
  cs.menciones_credito,
  CASE
    WHEN cb.cashback_perdido_mes > 300  THEN 'A'
    WHEN cb.cashback_perdido_mes >= 100 THEN 'B'
    ELSE 'C'
  END                                                               AS segmento_pro
FROM clientes c
JOIN cashback_base cb USING (user_id)
LEFT JOIN conv_signals cs USING (user_id)
WHERE c.es_hey_pro = FALSE
ORDER BY cb.cashback_perdido_mes DESC;
```

**Tiempo estimado de ejecución batch**: 12–20 s (7,680 usuarios no-Pro × join conversaciones).

---

### UC4 — Contexto Conversacional en Tiempo Real

> **Trigger**: cada nueva conversación entrante (request por `user_id`).
> **Índices usados**: `idx_conv_user_date`, `idx_txn_user_fecha`, `idx_prod_user_tipo`.

```sql
-- Q-UC4: Ensamblar contexto completo del usuario para Havi (single query)
SELECT
  c.user_id,
  c.es_hey_pro,
  c.preferencia_canal,
  c.satisfaccion_1_10,
  c.patron_uso_atipico                                              AS usuario_atipico,
  -- Resumen transaccional reciente (lateral join)
  t_sum.n_tx_30d,
  t_sum.gasto_mes_actual,
  t_sum.ultimo_rechazo_ts,
  t_sum.tiene_disputa_abierta,
  -- Perfil conversacional histórico
  COALESCE(cv_sum.n_convs_total, 0)                                AS n_convs_total,
  cv_sum.intent_top,
  cv_sum.menciona_fraude,
  cv_sum.menciona_cashback,
  cv_sum.ultima_conv_ts,
  -- Productos activos del usuario
  prod.productos_activos_json,
  -- Últimos 3 intercambios (para few-shot prompt)
  recent.turns_json
FROM clientes c
-- Resumen transaccional últimos 30d
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)                                        AS n_tx_30d,
    SUM(monto) FILTER (
      WHERE tipo_operacion = 'compra'
        AND estatus        = 'completada'
        AND fecha_hora    >= DATE_TRUNC('month', NOW())
    )                                               AS gasto_mes_actual,
    MAX(fecha_hora) FILTER (
      WHERE estatus = 'no_procesada'
    )                                               AS ultimo_rechazo_ts,
    BOOL_OR(estatus = 'en_disputa')                 AS tiene_disputa_abierta
  FROM transacciones
  WHERE user_id  = c.user_id
    AND fecha_hora >= NOW() - INTERVAL '30 days'
) t_sum ON TRUE
-- Perfil conversacional histórico
LEFT JOIN LATERAL (
  SELECT
    COUNT(DISTINCT conv_id)                         AS n_convs_total,
    MODE() WITHIN GROUP (ORDER BY channel_source)   AS intent_top,
    BOOL_OR(
      input ILIKE '%fraude%' OR input ILIKE '%no reconozco%'
    )                                               AS menciona_fraude,
    BOOL_OR(
      input ILIKE '%cashback%' OR input ILIKE '%hey pro%'
    )                                               AS menciona_cashback,
    MAX(date)                                       AS ultima_conv_ts
  FROM conversaciones
  WHERE user_id = c.user_id
) cv_sum ON TRUE
-- Productos activos (JSON array para el contexto)
LEFT JOIN LATERAL (
  SELECT json_agg(
    json_build_object(
      'tipo',    tipo_producto,
      'estatus', estatus,
      'saldo',   saldo_actual
    ) ORDER BY tipo_producto
  )                                                 AS productos_activos_json
  FROM productos
  WHERE user_id = c.user_id
    AND estatus = 'activo'
) prod ON TRUE
-- Últimos 3 intercambios conversacionales
LEFT JOIN LATERAL (
  SELECT json_agg(
    json_build_object(
      'role',    CASE WHEN turn_idx % 2 = 0 THEN 'user' ELSE 'assistant' END,
      'content', input,
      'ts',      date
    ) ORDER BY date DESC
  )                                                 AS turns_json
  FROM (
    SELECT input, date, turn_idx
    FROM conversaciones
    WHERE user_id = c.user_id
    ORDER BY date DESC
    LIMIT 6
  ) sub
) recent ON TRUE
WHERE c.user_id = $1;   -- parámetro: user_id del request entrante
```

**Latencia estimada P95**: 150–280 ms con los 3 índices activos.

---

## 4. Frecuencia de Actualización

| UC | Modo | Trigger | Schedule | Latencia objetivo |
|---|---|---|---|---|
| **UC1** | Tiempo real | Nueva txn `no_procesada` | Event-driven (inmediato) | **< 200 ms** |
| **UC2** | Batch | `pg_cron` diario | 02:00 UTC | < 30 s (proceso completo) |
| **UC3** | Batch | `pg_cron` diario | 03:00 UTC | < 60 s (proceso completo) |
| **UC4** | Tiempo real | Nueva conversación entrante | Request-driven (inmediato) | **< 300 ms** |

### Arquitectura de actualización UC1 (tiempo real)

```
INSERT INTO transacciones WHERE estatus = 'no_procesada'
  │
  ├─► PostgreSQL TRIGGER → exec Q-UC1 → INSERT INTO feat_uc1_alertas
  │
  └─► FastAPI webhook (Notify/LISTEN) → POST /alerts/push → Havi
```

### Jobs batch UC2 + UC3 (pg_cron)

```sql
-- Registrar jobs en pg_cron
SELECT cron.schedule('feat-uc2-refresh', '0 2 * * *',
  'INSERT INTO feat_users_master (...) SELECT ... FROM txn_base ... ON CONFLICT (user_id) DO UPDATE ...');

SELECT cron.schedule('feat-uc3-refresh', '0 3 * * *',
  'INSERT INTO feat_uc3_candidates (...) SELECT ... FROM cashback_base ... ON CONFLICT (user_id, producto_candidato) DO UPDATE ...');

-- Validación post-batch a las 04:00 UTC
SELECT cron.schedule('feat-validate', '0 4 * * *',
  $$
    DO $$
    DECLARE n INTEGER;
    BEGIN
      SELECT COUNT(*) INTO n FROM feat_users_master WHERE updated_at >= CURRENT_DATE;
      IF n < 15000 THEN
        RAISE WARNING 'feat_users_master: solo % filas actualizadas hoy', n;
      END IF;
    END;
    $$
  $$);
```

---

## 5. Schemas de Payloads JSON por UC

### UC1 — Payload de Alertas

```json
{
  "user_id": "USR-00042",
  "request_ts": "2025-11-12T19:42:00Z",
  "latency_ms": 145,
  "alerts": [
    {
      "alert_type": "rechazo_saldo",
      "priority": "alta",
      "message": "Tu compra de $1,820 en supermercado fue rechazada. Tenés $5,400 disponibles en tu inversión Hey.",
      "recommended_action": {
        "type": "transferir_desde_inversion",
        "monto_sugerido": 2000,
        "cta": "Transferir ahora"
      },
      "context": {
        "transaccion_id": "TXN-8842910",
        "fecha_hora": "2025-11-12T19:42:00Z",
        "monto": 1820.00,
        "motivo": "saldo_insuficiente",
        "saldo_inversion_disponible": 5400.00,
        "es_cronico": false,
        "n_rechazos_30d": 1
      }
    },
    {
      "alert_type": "txn_atipica",
      "priority": "critica",
      "message": "Detectamos una compra internacional nocturna fuera de tu patrón habitual.",
      "recommended_action": {
        "type": "confirmar_transaccion",
        "cta": "¿Reconocés esta compra?"
      },
      "context": {
        "transaccion_id": "TXN-8842911",
        "fecha_hora": "2025-11-12T23:15:00Z",
        "es_internacional": true,
        "es_nocturna": true
      }
    }
  ]
}
```

**Tipos de `alert_type`**: `rechazo_saldo` · `rechazo_limite` · `rechazo_diario` · `disputa_abierta` · `txn_atipica` · `gasto_recurrente_anomalo` · `liquidez_proxima` · `cashback_proximo_perdido`

---

### UC2 — Payload del Gemelo Digital

```json
{
  "user_id": "USR-00042",
  "generated_at": "2025-11-28T02:30:00Z",
  "persona": "Familiar planificado",
  "persona_confidence": 0.81,
  "key_traits": ["nomina_estable", "gasto_supermercado_alto", "score_bueno"],
  "embedding": [0.12, -0.45, 0.33, 0.07, -0.21, 0.88, 0.14, -0.63],
  "metrics": {
    "n_tx_30d": 42,
    "gasto_total_mes": 18450.00,
    "ticket_avg": 1740.00,
    "top_mcc": "supermercado",
    "cat_diversity": 7,
    "weekend_ratio": 0.34,
    "nocturnal_ratio": 0.08,
    "score_buro": 712,
    "ratio_deuda_ingreso": 0.22,
    "n_productos_activos": 3
  },
  "alerts_relevantes": ["liquidez_proxima"]
}
```

**Personas disponibles**: `Conservador con colchón` · `Joven explorador` · `Familiar planificado` · `Apretado por crédito` · `Empresario / negocios` · `Hey Pro power user` · `Receptor de remesas` · `Inactivo / dormido`

---

### UC3 — Payload de Recomendaciones de Upselling

```json
{
  "user_id": "USR-00042",
  "generated_at": "2025-11-28T03:15:00Z",
  "segmento_pro": "A",
  "recommendations": [
    {
      "producto": "hey_pro",
      "score": 0.91,
      "reason": "Pierde $345/mes en cashback. Tiene nómina domiciliada y ya preguntó por beneficios en Havi.",
      "expected_value_mxn": 345.00,
      "next_best_message": "Activá Hey Pro y empezá a ganar 1% en todas tus compras",
      "evidence": {
        "cashback_perdido_mes": 345.00,
        "top_categoria_perdida": "restaurante",
        "menciones_pro_en_havi": 2
      }
    },
    {
      "producto": "credito_nomina",
      "score": 0.74,
      "reason": "Nómina estable, score 712, sin crédito_nomina vigente.",
      "expected_value_mxn": null,
      "next_best_message": "Accedé a tu crédito de nómina con la mejor tasa"
    }
  ]
}
```

**Segmentos Pro**: `A` (cashback perdido > $300/mes) · `B` ($100–$300) · `C` (< $100)

---

### UC4 — Payload del Contexto Conversacional

```json
{
  "user_id": "USR-00042",
  "request_ts": "2025-11-12T20:01:00Z",
  "latency_ms": 198,
  "user_profile": {
    "es_hey_pro": true,
    "preferencia_canal": "app_ios",
    "satisfaccion_1_10": 8,
    "n_tx_30d": 42,
    "gasto_mes_actual": 18450.00,
    "ultimo_rechazo_ts": "2025-11-12T19:42:00Z",
    "tiene_disputa_abierta": false,
    "productos_activos": [
      { "tipo": "cuenta_debito",       "estatus": "activo", "saldo": 3200.00 },
      { "tipo": "tarjeta_credito_hey", "estatus": "activo", "saldo": 12000.00 },
      { "tipo": "inversion_hey",       "estatus": "activo", "saldo": 5400.00 }
    ]
  },
  "conversational_profile": {
    "n_convs_total": 4,
    "intent_top": "pregunta_beneficios",
    "menciona_fraude": false,
    "menciona_cashback": true,
    "ultima_conv_ts": "2025-10-05T14:22:00Z"
  },
  "recent_turns": [
    { "role": "user",      "content": "¿Cuánto tengo disponible?",         "ts": "2025-10-05T14:22:00Z" },
    { "role": "assistant", "content": "Tenés $3,200 en tu cuenta débito.", "ts": "2025-10-05T14:22:05Z" }
  ],
  "havi_context_injection": {
    "alerts":          ["rechazo_saldo reciente a las 19:42"],
    "recommendations": ["hey_pro: ahorra $345/mes en cashback"],
    "persona":         "Familiar planificado"
  }
}
```

---

## 6. Dataset de Conversaciones en el Pipeline

El dataset `dataset_50k_anonymized.parquet` cumple **tres roles distintos**:

| Rol | Uso | UC |
|---|---|---|
| **Fine-tuning / Few-shot** | Ejemplos de diálogo previos inyectados al prompt de Havi | UC4 |
| **Feature engineering** | Señales de intención (`menciona_fraude`, `menciona_cashback`) → features para todos los UCs | UC1, UC3 |
| **Benchmark de evaluación** | Medir si Havi mejora el CSAT (NPS delta pre/post) | UC2 |

### Pipeline de ingesta del parquet

```
dataset_50k_anonymized.parquet
  │
  ├─ Deduplicar 18 filas duplicadas
  ├─ Normalizar encoding \ufffd → UTF-8 (unicodedata.normalize "NFKD")
  ├─ Parsear fecha (nanosegundos → TIMESTAMPTZ): pd.to_datetime(..., format="mixed")
  ├─ Cast channel_source → CHAR(1) — comparar con == "1", no == 1
  ├─ Drop columna es_dato_sintetico si existe
  │
  ▼
INSERT INTO conversaciones (conv_id, turn_idx, user_id, date, input, output, channel_source)
  │
  ├─► feat_uc4_turns.parquet     (embeddings por turno — job offline, batch semanal)
  ├─► feat_uc4_convs.parquet     (perfil por conversación — job offline, batch semanal)
  └─► feat_conv_* en feat_users_master  (señales agregadas — batch diario)
```

### Pre-procesamiento Python requerido

```python
import pandas as pd
import unicodedata

df = pd.read_parquet("dataset_50k_anonymized.parquet")
df = df.drop_duplicates()                                        # elimina 18 duplicados
df["date"] = pd.to_datetime(df["date"], format="mixed")         # parsear nanosegundos
df["channel_source"] = df["channel_source"].astype(str)         # forzar "1"/"2" string
df["input"]  = df["input"].apply(
    lambda x: unicodedata.normalize("NFKD", str(x) if pd.notna(x) else ""))
df["output"] = df["output"].apply(
    lambda x: unicodedata.normalize("NFKD", str(x) if pd.notna(x) else ""))
df = df.drop(columns=["es_dato_sintetico"], errors="ignore")     # artefacto sintético
```

---

## 7. Endpoints FastAPI

| Endpoint | Método | UC | Modo | Latencia P95 |
|---|---|---|---|---|
| `/context/uc1/{user_id}` | GET | UC1 | Real-time (Q-UC1 en vivo) | **< 200 ms** |
| `/context/uc2/{user_id}` | GET | UC2 | Cache (`feat_users_master`) | < 50 ms |
| `/context/uc3/{user_id}` | GET | UC3 | Cache (`feat_uc3_candidates`) | < 50 ms |
| `/context/uc4/{user_id}` | GET | UC4 | Real-time (Q-UC4 en vivo) | **< 300 ms** |
| `/context/full/{user_id}`| GET | All | Mix (UC1+UC4 en vivo, UC2+UC3 cache) | < 350 ms |
| `/alerts/push`           | POST | UC1 | Webhook async (LISTEN/NOTIFY) | async |
| `/health`                | GET | — | — | < 5 ms |

### Respuesta unificada `/context/full/{user_id}`

```json
{
  "user_id": "USR-00042",
  "havi_context": {
    "uc1": { "alerts": [ ... ] },
    "uc2": { "persona": "Familiar planificado", "key_traits": [ ... ] },
    "uc3": { "recommendations": [ ... ] },
    "uc4": { "recent_turns": [ ... ], "intent_top": "pregunta_beneficios" }
  },
  "assembled_prompt_tokens": 1842,
  "latency_breakdown_ms": {
    "uc1_query":        145,
    "uc4_query":        198,
    "uc2_cache_lookup":   3,
    "uc3_cache_lookup":   2,
    "context_assembly":  12,
    "total":            360
  }
}
```

---

## 8. Estrategia de Latencia UC1 y UC4

### 8.1 Índices (ya especificados en §2.2)

Los 7 índices parciales sobre `user_id`, `estatus`, `tipo_producto` y `fecha_hora` reducen el tiempo de query de ~800 ms (full scan) a **80–200 ms** con buffer pool caliente.

### 8.2 Connection pooling

```
FastAPI (asyncpg) → PgBouncer (pool_size=20, max_client=100, mode=TRANSACTION) → PostgreSQL 16
```

Usar modo `TRANSACTION` en PgBouncer para latencia mínima en queries cortos.

### 8.3 Cache L1 (Redis)

Para UC2 y UC3 (datos batch) cachear el resultado de `feat_users_master` y `feat_uc3_candidates` por `user_id` con TTL = 1 h. Esto reduce la latencia de GET de ~50 ms a **< 5 ms** para usuarios frecuentes.

### 8.4 Resumen de latencias

| Capa | UC1 | UC4 | UC2 | UC3 |
|---|---|---|---|---|
| PostgreSQL con índices | ✅ 80–150 ms | ✅ 150–280 ms | Batch (no aplica) | Batch (no aplica) |
| PgBouncer | ✅ Crítico | ✅ Crítico | Opcional | Opcional |
| Redis L1 | — | Opcional | ✅ Recomendado (< 5 ms) | ✅ Recomendado (< 5 ms) |
| **Latencia P95 estimada** | **150–200 ms** | **200–280 ms** | **5–50 ms** | **5–50 ms** |

> Ambas (UC1 y UC4) cumplen el requerimiento de **< 500 ms** con margen. El objetivo interno es < 300 ms.

---

## 9. Dependencias de Infraestructura

| Componente | Versión sugerida | Rol |
|---|---|---|
| PostgreSQL | 16.x | Base de datos de producción |
| PgBouncer | 1.22.x | Connection pooling |
| pg_cron | 1.6.x | Jobs batch diarios |
| FastAPI | 0.115.x | API layer |
| SQLAlchemy | 2.x (async) | ORM + query builder |
| asyncpg | 0.30.x | Driver async PostgreSQL |
| Redis | 7.x | Cache L1 (UC2/UC3) |
| sentence-transformers | 3.x | Embeddings UC4 (job offline) |

---

## 10. Checklist de Implementación Backend

| # | Tarea | UC | Prioridad |
|---|---|---|---|
| 1 | Crear tablas raw + índices (DDL §2.1 y §2.2) | Todos | Alta |
| 2 | ETL one-shot: cargar 4 CSVs/parquet con pre-procesamiento §6 | Todos | Alta |
| 3 | Implementar Q-UC1 como trigger + INSERT en `feat_uc1_alertas` | UC1 | Alta |
| 4 | Implementar Q-UC4 en endpoint `/context/uc4/{user_id}` | UC4 | Alta |
| 5 | Implementar Q-UC2 como job pg_cron 02:00 UTC | UC2 | Media |
| 6 | Implementar Q-UC3 como job pg_cron 03:00 UTC | UC3 | Media |
| 7 | Crear tablas `feat_*` (DDL §2.3) | Todos | Media |
| 8 | Configurar PgBouncer (pool_size=20, modo TRANSACTION) | UC1+UC4 | Alta |
| 9 | Configurar Redis TTL=1h para UC2/UC3 | UC2+UC3 | Baja |
| 10 | Endpoint `/context/full/{user_id}` (respuesta unificada §7) | Todos | Media |

---

> **Relacionado**: [`docs/findings/UC1_anomalias_y_alertas.md`](./findings/UC1_anomalias_y_alertas.md) · [`UC2_gemelo_digital.md`](./findings/UC2_gemelo_digital.md) · [`UC3_upselling.md`](./findings/UC3_upselling.md) · [`UC4_conversacional.md`](./findings/UC4_conversacional.md) · [`FEATURE_ENGINEERING_PLAN.md`](./FEATURE_ENGINEERING_PLAN.md)
