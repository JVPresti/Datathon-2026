# UC3 · Upselling Inteligente — Findings

> **Owner**: Jorge Vázquez · **Output esperado**: lista rankeada de productos recomendados con score de confianza por usuario.
> **Fuentes**: `notebooks/uc3/01_analisis_portafolio_productos.ipynb`, `notebooks/uc3/02_eda_cashback_perdido.ipynb`, `notebooks/uc3/03_eda_cashback_perdido_jv.py`, `notebooks/eda/02_eda_clientes_dq.ipynb`.

---

## 1. Universo y oportunidades de upselling

### 1.1 Composición actual del portafolio

| Producto | Penetración | Hueco de upsell |
|---|---:|---|
| `cuenta_debito` | **100 %** | — saturado |
| `tarjeta_credito_hey` | 19.4 % | **80.6 % es target** |
| `inversion_hey` | 11.5 % | **88.5 % es target** |
| `seguro_vida` | 6.4 % | **93.6 % es target** |
| `credito_nomina` | 5.3 % | filtrar a `nomina_domiciliada` (34.1 %) |
| `credito_personal` | 4.0 % | requiere `score_buro` aceptable |
| `cuenta_negocios` | 3.5 % | filtrar a `Empresario` / `Independiente` |
| `seguro_compras` | 3.3 % | bundle con TC |
| `tarjeta_credito_negocios` | 2.9 % | bundle con `cuenta_negocios` |
| `tarjeta_credito_garantizada` | 2.8 % | target = no califica para TC normal |
| `credito_auto` | 2.5 % | requiere ingreso/score |

> **Sub-poblaciones inactivas**: 8,937 productos contratados pero **sin transacciones** en el período. Señal de "producto dormido" que también es accionable (re-engagement, no upselling puro).

### 1.2 Hey Pro como producto-eje
- **48.9 %** de los usuarios es Hey Pro → **51.1 % es target** del producto más rentable de upselling (cashback 1 % + beneficios).
- Cashback total generado por Pros = **$2,670,792 MXN** en el período → buen anchor para mostrar "lo que perdés sin Pro".

## 2. Hallazgos UC3 principal: cashback perdido ✅

> Notebook fuente: `notebooks/uc3/02_eda_cashback_perdido.ipynb` + script `notebooks/uc3/03_eda_cashback_perdido_jv.py`.

### 2.1 Regla de cálculo (validada)
```
cashback_potencial = monto * 0.01
filtro: es_hey_pro == False AND tipo_operacion == "compra" AND estatus == "completada"
```
Sanity check del script: el `cashback_generado` real para Pros == `monto * 0.01` con **>95 % match**. Regla confirmada.

### 2.2 Output del script `.py` ✅
Archivo persistido: `outputs/uc3_cashback_perdido.csv` (7,680 filas, una por usuario no-Pro):

```
user_id,cashback_perdido_mes,top_categoria_perdida,monto_top_categoria
USR-00004,23.38,restaurante,23.38
USR-00009,0.0,ninguna,0.0
...
```

Cubre **el último mes cerrado** (mes anterior al máximo en el dataset). Útil para mensajes "el mes pasado perdiste $X".

### 2.3 Segmentación A/B/C (notebook `02_eda_cashback_perdido.ipynb`)
Definición sobre `cashback_perdido_mensual` (mean over months con compras):

| Segmento | Umbral | Mensaje sugerido |
|---|---|---|
| **A** | mean mensual **> $300** | "Activá Hey Pro: perdés $X cada mes" |
| **B** | $100-300 | "Si activás Pro recuperás ~$200 mensuales" |
| **C** | < $100 | "Conoce Hey Pro" (low-pressure) |

Sub-segmentación: **A + `nomina_domiciliada`** = "**activación inmediata**" (mayor probabilidad de conversión).

### 2.4 Cruce conversacional
- % de no-Pro que mencionan `cashback|beneficios|hey pro` en sus conversaciones con Havi → señal directa de intención.
- KPIs persistidos en `outputs/uc4_intent_taxonomy.json` (revisar con re-run).

## 3. Hallazgos sobre portafolio (señales adicionales) ✅

> Notebook fuente: `notebooks/uc3/01_analisis_portafolio_productos.ipynb`.

### 3.1 Métricas calculables (lógica codificada)
- `pct_inversion` y `pct_inversion_con_saldo` → propensión a sumar producto de inversión.
- `% TC con utilizacion_pct ≥ 0.9` → **NO** target de TC adicional, **SÍ** target de aumento de línea.
- `mediana monto_mensualidad` en préstamos > 0 → calibrar oferta de refinanciamiento.
- `num_productos_activos` promedio → benchmark para "users debajo del promedio = subexpuestos".
- Solapamiento `inversion_hey ∩ cuenta_debito` → casi total (esperable).

### 3.2 Hey Pro y nómina como dobles palancas
- 5,128 usuarios con `nomina_domiciliada` (34.1 %).
- Cruce `nomina × no-Pro × cashback_perdido_segA` = **target premium** para campaña Pro.
- Cruce `nomina × score_buro > 670 × sin credito_nomina` = target para `credito_nomina`.

## 4. Hallazgos sobre comportamiento de transacción (input al ranker) ✅

| Señal | Para qué producto |
|---|---|
| Alto gasto en `restaurante` + `entretenimiento` | TC con beneficios en estos MCCs |
| Alto gasto en `transporte` + `viajes` | TC viajera o seguro de viaje |
| `transf_entrada` recurrentes desde el mismo origen | nómina (aunque no esté flagged) → `credito_nomina` |
| `abono_inversion` ya activos | `inversion_hey` premium / GAT mayor |
| `pago_servicio` recurrentes a aseguradoras | `seguro_compras` o `seguro_vida` |
| `compra` con MSI activos | TC con MSI extendido |
| `recibe_remesas = True` | producto multi-divisa o cuenta dollar |

## 5. Implicaciones para Feature Engineering

### 5.1 Features a nivel **(usuario, producto candidato)**

Tabla "wide" con una fila por par usuario-producto-elegible (excluye productos ya contratados):

| Feature | Descripción |
|---|---|
| `feat_persona_uc2` | Persona financiera asignada por UC2 |
| `feat_score_buro` | raw |
| `feat_ingreso_log` | log1p ingreso |
| `feat_ratio_deuda_ingreso` | de UC2 / `02_eda_compromisos` |
| `feat_n_productos_actuales` | num_productos_activos |
| `feat_es_hey_pro` | bool |
| `feat_nomina_domiciliada` | bool |
| `feat_dias_desde_ultimo_login` | recency app |
| `feat_satisfaccion` | NPS |
| `feat_cashback_perdido_mensual` | si producto candidato == Hey Pro |
| `feat_share_mcc_<top10>` | share del usuario en cada MCC top10 |
| `feat_top_categoria_gasto` | mode MCC |
| `feat_utilizacion_tc_max` | util max si tiene TC |
| `feat_volumen_transf_entrada_mensual` | proxy de nómina |
| `feat_n_abonos_inversion_mensual` | engagement con inversión |
| `feat_menciona_producto_en_havi` | bool keyword en conversaciones |
| `feat_conv_intent_solicitud_producto` | de UC4 (intent classifier) |

### 5.2 Features a nivel **producto** (catálogo)

| Feature | Descripción |
|---|---|
| `prod_penetracion` | % usuarios actuales con el producto |
| `prod_revenue_proxy` | margen estimado (definir con negocio) |
| `prod_tasa_conversion_historica` | si hay datos de campañas (no en este dataset) |

### 5.3 Modelos sugeridos

| Etapa | Modelo | Métrica |
|---|---|---|
| **Recall** (¿es elegible?) | reglas + filtros (sin TC ya, score mín., ingreso mín.) | coverage |
| **Ranking** (probabilidad de adopción) | LightGBM clasificador binario por producto · o multi-output | AUC, NDCG@5 |
| **Prioridad final** | re-ranker con margen × probabilidad | revenue@5 |

> Sin labels de adopción reales en el dataset, **proxy labels** posibles:
> - "ya lo tiene" = 1, "no lo tiene" = 0 → entrena propensión, no adopción.
> - Para Hey Pro: proxy = "es Pro" (positivo) vs "no es Pro y cashback_perdido alto" (target plausible).

## 6. Output esperado del UC3

```json
{
  "user_id": "USR-00042",
  "recommendations": [
    {
      "producto": "hey_pro",
      "score": 0.91,
      "reason": "Pierde $345/mes en cashback. Tiene nómina domiciliada y ya pregunta por beneficios.",
      "expected_value_mxn": 345,
      "next_best_message": "Activá Hey Pro y empezá a ganar 1% en todas tus compras"
    },
    {
      "producto": "credito_nomina",
      "score": 0.74,
      "reason": "Nómina estable, score 712, sin crédito_nomina vigente.",
      "expected_value_mxn": null
    }
  ]
}
```

## 7. Pendientes inmediatos antes de Feature Eng

- [ ] **Re-ejecutar** `notebooks/uc3/02_eda_cashback_perdido.ipynb` y persistir `outputs/uc3_nopro_cashback_segmentos.csv` y `outputs/uc3_cashback_kpis.json`.
- [ ] **Re-ejecutar** `notebooks/uc3/01_analisis_portafolio_productos.ipynb` para llenar % concretos (TC al límite, % inversión con saldo, etc.).
- [ ] **Definir reglas de elegibilidad** por producto (ingreso mínimo, score mínimo, mutual exclusion).
- [ ] **Acordar con UC4** la lista de keywords/intents que sirven como feature de intención.
- [ ] **Decidir** si UC3 corre **una sola pasada** (catálogo completo por usuario) o **producto por producto** (más simple, más interpretable).
