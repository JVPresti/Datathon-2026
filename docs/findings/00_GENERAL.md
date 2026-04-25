# 00 · Findings Generales — datamoles

> **Propósito**: foto integral del dataset y conclusiones transversales que aplican a los 4 UCs.
> **Fuentes**: `notebooks/eda/00_eda_unificado_dq.ipynb`, `notebooks/eda/01_eda_carga_datos.ipynb`, `notebooks/eda/02_eda_clientes_dq.ipynb`, `notebooks/eda/03_eda_transacciones_dq.ipynb`.
> **Última actualización**: Abril 2026.

---

## 1. Volumetría confirmada ✅

| Dataset | Archivo | Filas | Columnas | PK | Período observado |
|---|---|---:|---:|---|---|
| Clientes | `hey_clientes.csv` | **15,025** | 22 | `user_id` | snapshot |
| Productos | `hey_productos.csv` | **38,909** | 12 | `producto_id` | snapshot |
| Transacciones | `hey_transacciones.csv` | **802,384** | 21 | `transaccion_id` | **2025-01-01 → 2025-12-15** |
| Conversaciones | `dataset_50k_anonymized.parquet` | **49,999** | 6 | `conv_id` + fila | **2025-01-07 → 2025-11-28** |

> ⚠️ Las **conversaciones cortan ~17 días antes** que las transacciones. Para features que requieran joins ventana→ventana, alinear al período común `[2025-01-07, 2025-11-28]`.

## 2. Integridad referencial ✅

Verificada en `notebooks/eda/01_eda_carga_datos.ipynb`:

| Check | Resultado |
|---|---|
| `user_id` en productos → clientes | 0 huérfanos |
| `user_id` en transacciones → clientes | 0 huérfanos |
| `user_id` en conversaciones → clientes | 0 huérfanos |
| `producto_id` en transacciones → productos | 0 huérfanos |
| **Cobertura cruzada** (4 datasets) | **15,025 / 15,025 = 100 %** |
| Productos sin transacciones | **8,937** (23 % del catálogo) |
| `producto_id` únicos en transacciones | 29,972 |

**Implicación clave**: cualquier feature por `user_id` se puede unir a las 4 fuentes sin perder usuarios. El subset de **8,937 productos "dormidos"** es señal viva para UC3 (productos contratados pero sin uso).

## 3. Calidad de datos por columna ✅

### 3.1 Nulos estructurales (NO imputar)

Son nulos *by design* — solo aplican cuando una operación o producto cae en cierta categoría.

| Columna | Tabla | % Nulos | Cuándo está poblada |
|---|---|---:|---|
| `motivo_no_procesada` | transacciones | 96.7 % | Solo si `estatus == "no_procesada"` |
| `meses_diferidos` | transacciones | 97.8 % | Solo compras MSI |
| `cashback_generado` | transacciones | 77.5 % | Solo Hey Pro × `compra` × `completada` |
| `comercio_nombre` | transacciones | 46.2 % | Solo operaciones contra comercio |
| `dispositivo` | transacciones | 25.2 % | Solo si `canal` empieza con `app_` |
| `plazo_meses`, `monto_mensualidad` | productos | 88.3 % | Solo préstamos |
| `limite_credito`, `utilizacion_pct` | productos | 63.2 % | Solo crédito |
| `tasa_interes_anual` | productos | 51.7 % | Solo productos con interés |
| `saldo_actual` | productos | 9.6 % | Nulo en seguros |

**Política**: nunca `fillna(0)` para promedios; usar **filtros condicionales** o **flags `_disponible`**.

### 3.2 Nulos de calidad (sí imputar / decidir)

| Columna | Tabla | % Nulos | Recomendación |
|---|---|---:|---|
| `satisfaccion_1_10` | clientes | 5.0 % | Imputar mediana 7.0, o flag + drop |
| `estado`, `ciudad` | clientes | 2.9 % c/u | `"Desconocido"` + flag |
| `descripcion_libre` | transacciones | 7.7 % | Tratar nulo como sin texto |
| `ciudad_transaccion` | transacciones | 2.4 % | Imputar con ciudad de residencia |

### 3.3 Duplicados

- **0** filas duplicadas en `hey_clientes`, `hey_productos`, `hey_transacciones`.
- **18** filas duplicadas en `dataset_50k_anonymized.parquet` → **deduplicar antes** de cualquier modelado de secuencias.

### 3.4 Gotchas confirmados ⚠️

1. La columna en `hey_clientes.csv` se llama **`sexo`**, no `genero` (el diccionario oficial dice `genero`).
2. `channel_source` carga como **string** (`"1"` / `"2"`), no `int`. Comparar con `== "1"`.
3. `date` en el parquet trae **nanosegundos**: parsear con `pd.to_datetime(..., format="mixed")`.
4. Algunos CSVs traen `es_dato_sintetico` como artefacto: dropear al cargar.
5. `patron_uso_atipico` existe en **dos tablas** (clientes y transacciones) con semántica distinta:
   - En clientes → bandera de usuario (5.1 % = 763 clientes).
   - En transacciones → bandera de movimiento (5.17 % = 41,492 txn).
   - **No mezclar** sin renombrar.
6. Encoding: textos del parquet pueden traer `\ufffd`. Normalizar con `unicodedata.normalize` antes de vectorizar.

## 4. Métricas globales de referencia ✅

| Métrica | Valor |
|---|---:|
| Edad media | 37.2 años |
| Ingreso mensual mediana | $24,000 MXN |
| Ingreso mensual media | $29,794 MXN |
| Score Buró medio | 618 / 850 |
| Antigüedad media | 935 días (~2.6 años) |
| Productos por cliente (media) | 2.59 |
| Transacciones por cliente (media) | 53.4 |
| Monto mediano por txn | $1,740 MXN |
| Monto promedio por txn | $6,108 MXN |
| % txn `completada` | 93.3 % |
| % txn `no_procesada` (rechazo) | 3.32 % |
| % txn `en_disputa` | 2.37 % |
| % txn `revertida` | 1.06 % |
| % txn con `patron_uso_atipico` | 5.17 % |
| % txn internacionales | 4.99 % |
| % txn con reintento (`intento_numero > 1`) | 2.21 % |
| Cashback total generado (Hey Pro) | **$2,670,792 MXN** |
| Conversaciones / usuario (media) | 1.61 |
| Turnos / conversación (media) | 2.07 |
| NPS medio (`satisfaccion_1_10`) | 7.48 / 10 |
| % Hey Pro | 48.9 % |
| % nómina domiciliada | 34.1 % |
| % `recibe_remesas` | 8.3 % |

## 5. Distribuciones críticas ✅

### 5.1 `tipo_operacion` — top
| Operación | N | % |
|---|---:|---:|
| `compra` | 319,524 | 39.8 % |
| `transf_entrada` | 92,167 | 11.5 % |
| `transf_salida` | 90,116 | 11.2 % |
| `cargo_recurrente` | 67,249 | 8.4 % |
| `pago_credito` | 51,651 | 6.4 % |
| `pago_servicio` | 48,562 | 6.1 % |
| `abono_inversion` | 41,769 | 5.2 % |
| `retiro_cajero` | 38,989 | 4.9 % |

### 5.2 `categoria_mcc` — top 5
| Categoría | N |
|---|---:|
| `transferencia` | 367,049 |
| `servicios_digitales` | 92,557 |
| `restaurante` | 75,493 |
| `supermercado` | 63,011 |
| `gobierno` | 61,401 |

### 5.3 `canal` — top
| Canal | N | % |
|---|---:|---:|
| `app_ios` | 268,313 | 33.4 % |
| `app_android` | 226,431 | 28.2 % |
| `pos_fisico` | 110,411 | 13.8 % |
| `app_huawei` | 105,577 | 13.2 % |
| `cajero_banregio` | 26,526 | 3.3 % |
| `codi` | 26,354 | 3.3 % |

### 5.4 Catálogo de productos
| Tipo | N | % |
|---|---:|---:|
| `cuenta_debito` | 15,025 | 38.6 % — **todos los usuarios** |
| `tarjeta_credito_hey` | 7,565 | 19.4 % |
| `inversion_hey` | 4,474 | 11.5 % |
| `seguro_vida` | 2,480 | 6.4 % |
| `credito_nomina` | 2,044 | 5.3 % |
| `credito_personal` | 1,549 | 4.0 % |
| `cuenta_negocios` | 1,343 | 3.5 % |
| `seguro_compras` | 1,270 | 3.3 % |
| `tarjeta_credito_negocios` | 1,111 | 2.9 % |
| `tarjeta_credito_garantizada` | 1,091 | 2.8 % |
| `credito_auto` | 957 | 2.5 % |

> Estatus: `activo` 86.2 % · `cancelado` 7.5 % · `suspendido` 3.7 % · `revision_de_pagos` 2.6 %.

## 6. Distribuciones para conversaciones ✅

| Métrica | Valor |
|---|---:|
| Turnos totales | 49,999 |
| Conversaciones únicas | 24,119 |
| Usuarios únicos | 15,025 (100 % cobertura clientes) |
| `channel_source = "1"` (texto) | 46,936 (93.9 %) |
| `channel_source = "2"` (voz) | 3,063 (6.1 %) |
| Conversaciones de 1 turno | 15,000 (62 %) |
| Turnos por conversación (media) | 2.07 |
| Turnos por conversación (máx.) | 21 |

## 7. Segmentos transversales para todo modelo

Listos para usar como cohortes / cortes:

```python
hey_pro    = clientes[clientes["es_hey_pro"]]              # 7,345
no_pro     = clientes[~clientes["es_hey_pro"]]             # 7,680
nomina     = clientes[clientes["nomina_domiciliada"]]      # ~5,128
atipicos   = clientes[clientes["patron_uso_atipico"]]      # 763
remesas    = clientes[clientes["recibe_remesas"]]          # ~1,251
huawei     = clientes[clientes["preferencia_canal"] == "app_huawei"]
con_inversion = clientes_x_productos.query("tipo_producto=='inversion_hey' and estatus=='activo'")
```

## 8. Decisiones tomadas en EDA (ya cerradas)

| Decisión | Razón | Aplica a |
|---|---|---|
| Período de análisis = **2025-01-07 a 2025-11-28** | Intersección txn ∩ conv | UC4 + cualquier cruce |
| Cohorte master = **15,025 user_ids** del clientes | Cobertura 100 % | Todos |
| Loader único con dtypes en `01_eda_carga_datos.ipynb` | Evitar parseo inconsistente | Todos |
| Para UC1, "rechazo accionable" = **`estatus=="no_procesada"` AND `motivo_no_procesada in {saldo_insuficiente, limite_excedido}`** → 6,638 txn (0.83 % del total, 24.9 % de los rechazos) | Solo estos motivos son **resolubles por Havi** | UC1 |
| Para UC3 base, **cashback perdido** = `monto * 0.01` sobre no-Pro × `compra` × `completada` | Regla del 1% confirmada en sanity check (>95 % match) | UC3 |
| Drop `es_dato_sintetico` siempre que aparezca | Artefacto sintético | Todos |

## 9. Riesgos y deuda técnica abiertos ⚠️

1. **Notebooks con `outputs: []`** (necesitan re-ejecución para citar números reales):
   - `notebooks/eda/02_eda_clientes_dq.ipynb`
   - `notebooks/uc4/02_eda_atipicas.ipynb`
   - Algunas celdas finales del `00_eda_unificado_dq.ipynb` y de `01_eda_rechazos.ipynb` (sección de inversión).
2. **Bug menor en `notebooks/uc1/01_eda_rechazos.ipynb`**: `pd.cut` con bins no-monotónicos cuando `n_rechazos.max() == 5`. Reparar antes de feature eng.
3. **Path absolutos macOS** en `notebooks/uc2/01_eda_patrones_gasto_mcc_bi.ipynb` y `02_eda_clientes_dq.ipynb`. Reemplazar por `pathlib.Path` relativo al repo.
4. **Diferencia en cierre de mes** entre `02_eda_transacciones_dq.ipynb` (hasta 2025-12-15) y `01_eda_carga_datos.ipynb`: confirmar qué archivo es la versión canónica del CSV.
5. **`top_5` de cargos recurrentes** en `02_eda_compromisos_financieros.ipynb` colapsa a una sola categoría (`servicios_digitales`). Validar diversidad real de MCC en recurrentes — puede ser un quirk del print, no de los datos.
6. **Motivos de rechazo casi uniformes** (~12.4 % cada uno entre 8 motivos) → es un artefacto de generación sintética. Los modelos UC1 deben asumir **balance casi perfecto** (no esperar long-tail).

## 10. Archivos generados ✅

Outputs ya producidos por el EDA:

| Archivo | Origen | Contenido |
|---|---|---|
| `outputs/uc3_cashback_perdido.csv` | `notebooks/uc3/03_eda_cashback_perdido_jv.py` | 7,680 filas (todos los no-Pro) con `cashback_perdido_mes`, `top_categoria_perdida`, `monto_top_categoria` para el último mes cerrado |
| `outputs/uc1_fig*.png` | `notebooks/uc1/01_eda_rechazos.ipynb` | Visualizaciones del funnel UC1 (esperar re-ejecución del notebook) |
| `outputs/uc4_fig*.png` | `notebooks/uc4/01_eda_conversaciones.ipynb` | Visualizaciones del análisis conversacional |
| `outputs/uc4_intent_taxonomy.json` | `notebooks/uc4/01_eda_conversaciones.ipynb` | Taxonomía heurística de intents (KPIs por intent + top words) |

> Próximos artefactos esperados (post Feature Engineering): tablas `feat_*.parquet` por UC en `outputs/features/`.
