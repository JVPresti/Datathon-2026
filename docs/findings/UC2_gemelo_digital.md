# UC2 · Gemelo Digital — Findings

> **Owner**: Brayan Ivan · **Output esperado**: vector de perfil por usuario + clasificación en persona financiera.
> **Fuentes**: `notebooks/uc2/01_eda_patrones_gasto_mcc_bi.ipynb`, `notebooks/uc2/02_eda_compromisos_financieros.ipynb`, `notebooks/eda/02_eda_clientes_dq.ipynb`, `notebooks/uc3/01_analisis_portafolio_productos.ipynb`.

---

## 1. Premisa del Gemelo Digital

El gemelo se construye sobre **3 dimensiones**:

1. **Demografía & contexto** (clientes): edad, ingreso, educación, ocupación, geografía.
2. **Comportamiento transaccional** (transacciones × MCC × tiempo): qué compra, cuánto, cuándo, qué tan diversificado.
3. **Compromisos financieros** (productos + recurrentes): cuánto debe, qué carga fija tiene, salud crediticia.

La salida es un **vector denso** + una **persona financiera** asignada por clustering / reglas.

## 2. Hallazgos sobre patrones de gasto MCC ⚠️

> Notebook fuente: `notebooks/uc2/01_eda_patrones_gasto_mcc_bi.ipynb` — **resumen ejecutivo no fue ejecutado** (template "completar después de correr"). Hipótesis y framework definidos; números requieren re-run.

### 2.1 Categorías estructurales (ya validadas en EDA general)
- 14 valores en `categoria_mcc`. Top 5 cubren ~80 % del volumen (`transferencia`, `servicios_digitales`, `restaurante`, `supermercado`, `gobierno`).
- `transferencia` domina por count (367,049) → conviene **excluir** o tratar aparte para perfilar gasto "real" del usuario.

### 2.2 Métricas planeadas a nivel usuario
El notebook deja codificadas (no ejecutadas) las siguientes:

| Métrica | Definición |
|---|---|
| `n_transacciones` | total de movimientos | 
| `gasto_total` | `sum(monto)` |
| `ticket_avg` | `mean(monto)` |
| `cat_diversity` | nunique de `categoria_mcc` por usuario |
| `top_category` | `mode(categoria_mcc)` |
| `spend_concentration` | share del top1 MCC sobre `gasto_total` |
| `weekend_spend_ratio` | gasto sáb-dom / gasto total |
| `avg_ticket_by_category` | matriz user × mcc |

> Cuartiles de gasto se etiquetan como `bajo / medio-bajo / medio-alto / alto`. Útil como feature ordinal o segmento base.

## 3. Hallazgos sobre compromisos financieros ✅

> Notebook fuente: `notebooks/uc2/02_eda_compromisos_financieros.ipynb` (ejecutado).

### 3.1 Carga fija y ratio deuda/ingreso
- `carga_fija = sum(monto_mensualidad de productos préstamo) + sum(monto de cargos_recurrentes)`.
- `ratio_deuda_ingreso = carga_fija / ingreso_mensual_mxn`.
- **5.82 %** (874 usuarios) tiene `ratio > 0.4` — segmento de **estrés financiero**.
- Decil 10 del ratio = **1.46** → hay usuarios cuyo compromiso fijo supera 1× su ingreso mensual.

### 3.2 Cargos recurrentes
- En el run actual, el top-5 por suma de `monto` colapsa en **`servicios_digitales`** (~ $26.4M MXN).
- ⚠️ Sospechoso — verificar si es artefacto del print o si realmente todos los `cargo_recurrente` son del mismo MCC. Si lo es, significa que **suscripciones digitales son el único compromiso recurrente capturado** en el dataset sintético.

### 3.3 Cruce conversacional
- 1,936 turnos del parquet contienen `mensualidad|pago automático|suscripción` (en input u output). Útil para clasificar usuarios "preocupados por sus gastos fijos" como **persona financiera específica**.

## 4. Hallazgos sobre portafolio (input al twin) ✅

> Notebook fuente: `notebooks/uc3/01_analisis_portafolio_productos.ipynb` (ejecuta lógica; numericals se generan en runtime).

### 4.1 Composición media del portafolio
- 100 % de los usuarios tiene `cuenta_debito`.
- **48.9 %** tiene Hey Pro.
- **29.8 %** tiene `inversion_hey`. Sub-pregunta: ¿cuántos con saldo > 0? (cell ejecutable).
- **2.59** productos activos por cliente (media global).

### 4.2 Solapamientos relevantes (señales de persona)
- **Inversión + cuenta_debito** (esperable: casi todos los con inversión).
- TC con `utilizacion_pct ≥ 0.9` → segmento "**al límite**" — útil para persona "estresado-crédito".
- Préstamos con `monto_mensualidad` alto → "**comprometido a largo plazo**".

## 5. Hallazgos sobre demografía (clientes) ⚠️

> Notebook `notebooks/eda/02_eda_clientes_dq.ipynb` — **outputs vacíos en disco**, requiere re-run para confirmar % de outliers, pares de correlación |r|>0.7.

### 5.1 Lo que ya sabemos del dataset
- 22 columnas, 0 duplicados, 5 % nulos en `satisfaccion_1_10`, 2.9 % en `estado/ciudad`.
- `edad` rango 18-60 (media 37.2) → 4 bins de vida razonables: 18-25 / 26-35 / 36-50 / 51-60.
- `score_buro` rango 295-850 (media 618) → bins: pobre <580 / regular 580-669 / bueno 670-739 / excelente ≥740.
- `ingreso_mensual_mxn` muy sesgado (media $29.7k vs mediana $24k) → log + cuartiles.
- **No existe columna `segmento`** (verificado en `00_eda_unificado_dq.ipynb`); el segmento debe **derivarse** del clustering.

## 6. Personas financieras propuestas (taxonomía draft)

Basado en cruces de `ingreso × score × utilizacion × ratio_deuda × spend_concentration`:

| Persona | Heurística | % esperado |
|---|---|---:|
| **Conservador con colchón** | tiene `inversion_hey` + saldo > 0 · `ratio_carga < 0.2` · `score_buro > 670` | ~15 % |
| **Joven explorador** | `edad < 30` · diversidad MCC alta · gasto en `entretenimiento`/`viajes` alto · sin crédito grande | ~12 % |
| **Familiar planificado** | `edad 35-50` · `nomina_domiciliada` · `cuenta_debito` activa · gasto top en `supermercado` | ~20 % |
| **Apretado por crédito** | `utilizacion_pct ≥ 0.9` AND `ratio_carga > 0.4` | ~6 % (subset de 5.82 %) |
| **Empresario / negocios** | tiene `cuenta_negocios` o `tarjeta_credito_negocios` · `ocupacion in {Empresario, Independiente}` | ~14 % |
| **Hey Pro power user** | Hey Pro + alta frecuencia tx + diversidad MCC alta · cashback acumulado top-decil | ~10 % |
| **Receptor de remesas** | `recibe_remesas = True` · % alto de `transf_entrada` desde el extranjero | ~8 % |
| **Inactivo / dormido** | `dias_desde_ultimo_login > 90` · pocas tx mes-1 | ~10 % |
| **Otros / mixto** | resto | ~5 % |

> Estas personas son **propuestas**. La asignación final saldrá del clustering UC2 (HDBSCAN o KMeans con elbow + silhouette).

## 7. Implicaciones para Feature Engineering

### 7.1 Vector de perfil — bloques

| Bloque | Features | n aprox. |
|---|---|---:|
| **Demografía** | edad, edad_bin, sexo, nivel_educativo, ocupacion, estado_emb (target enc.), ingreso_log, ingreso_cuartil | 8 |
| **Relación con Hey** | antiguedad_dias, dias_desde_ultimo_login, es_hey_pro, nomina_domiciliada, canal_apertura, preferencia_canal, satisfaccion_1_10, idioma_preferido, usa_hey_shop | 9 |
| **Portafolio** | num_productos_activos, has_<tipo_producto> (one-hot por catálogo), n_tarjetas_credito, tiene_inversion, saldo_inversion_log, tiene_seguro | ~14 |
| **Crédito** | score_buro, utilizacion_pct_max, utilizacion_pct_promedio, n_creditos_activos, monto_mensualidad_total | 5 |
| **Compromisos** | carga_fija, ratio_deuda_ingreso, ratio_decil, n_recurrentes, monto_recurrente_promedio | 5 |
| **Comportamiento txn** | n_tx_30d, n_tx_90d, n_tx_anual, gasto_total, ticket_avg, ticket_p90 | 6 |
| **MCC** | top_category, cat_diversity (Shannon entropy), spend_concentration_top1, share por MCC top10 | ~14 |
| **Tiempo** | weekend_ratio, nocturnal_ratio, peak_hour, dia_semana_mas_activo | 4 |
| **Canal** | share_app, share_pos, share_codi, share_cajero | 4 |
| **Riesgo** | n_rechazos_anual, pct_atipicas, n_disputas, recibe_remesas | 4 |

**Total ≈ 73 features** crudas. Después se proyecta a embedding ~16-32 dims con autoencoder o se usa directamente para clustering.

### 7.2 Salidas esperadas

```python
{
  "user_id": "USR-00042",
  "persona": "Familiar planificado",
  "persona_confidence": 0.81,
  "embedding": [0.12, -0.45, ...],         # 16-32 dims
  "key_traits": ["nómina_estable", "gasto_supermercado_alto", "score_bueno"],
  "alerts_relevantes": ["liquidez_proxima"]   # tags compatibles con UC1
}
```

## 8. Pendientes inmediatos antes de Feature Eng

- [ ] **Re-ejecutar** `notebooks/eda/02_eda_clientes_dq.ipynb` para llenar resumen (outliers IQR, pares correlacionados, dropeo de constantes).
- [ ] **Re-ejecutar** `notebooks/uc2/01_eda_patrones_gasto_mcc_bi.ipynb` con paths del repo (no `/Users/diegodq/...`) para llenar el resumen.
- [ ] **Validar** el quirk de cargos recurrentes (¿realmente solo `servicios_digitales`?).
- [ ] **Decidir** si excluir `transferencia` del cálculo de `cat_diversity` y `spend_concentration` (recomendado: excluir).
- [ ] **Decidir** ventana temporal del perfil: ¿últimos 90d?, ¿histórico completo?, ¿dos vectores?
