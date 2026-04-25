# Hey Banco — Datathon 2026: Contexto de Datos para Agentes

> Este documento describe los 4 datasets disponibles, su estructura, relaciones, estadísticas clave y guías de uso.
> Fue generado tras la Tarea 0 de EDA. Úsalo como contexto base antes de cualquier análisis.

---

## 1. Resumen ejecutivo

| Dataset | Archivo | Formato | Filas | Columnas | Clave primaria |
|---------|---------|---------|------:|----------:|----------------|
| Clientes | `hey_clientes.csv` | CSV | 15,025 | 22 | `user_id` |
| Productos | `hey_productos.csv` | CSV | 38,909 | 12 | `producto_id` |
| Transacciones | `hey_transacciones.csv` | CSV | 802,384 | 21 | `transaccion_id` |
| Conversaciones | `dataset_50k_anonymized.parquet` | Parquet | 49,999 | 6 | `conv_id` + fila |

**Período:** enero–diciembre 2025 (transacciones) · enero–noviembre 2025 (conversaciones).
**Todos los datos son 100% sintéticos.** Todos los textos en español (MX). IDs irreversibles.

---

## 2. Rutas de los archivos

```python
from pathlib import Path

BASE_TXN  = Path("Datathon_Hey_2026_dataset_transacciones 1/dataset_transacciones")
BASE_CONV = Path("Datathon_Hey_dataset_conversaciones 1/dataset_conversaciones")

# Carga recomendada
import pandas as pd

df_clientes = pd.read_csv(BASE_TXN / "hey_clientes.csv", dtype={"user_id": str})
df_productos = pd.read_csv(BASE_TXN / "hey_productos.csv",
                           dtype={"producto_id": str, "user_id": str},
                           parse_dates=["fecha_apertura", "fecha_ultimo_movimiento"])
df_transacc = pd.read_csv(BASE_TXN / "hey_transacciones.csv",
                          dtype={"transaccion_id": str, "user_id": str, "producto_id": str},
                          parse_dates=["fecha_hora"])
df_convs = pd.read_parquet(BASE_CONV / "dataset_50k_anonymized.parquet")
df_convs["date"] = pd.to_datetime(df_convs["date"], format="mixed")

# Quitar columna de metadato sintético si existe
for df in [df_productos, df_transacc]:
    if "es_dato_sintetico" in df.columns:
        df.drop(columns=["es_dato_sintetico"], inplace=True)
```

---

## 3. Modelo relacional

```
hey_clientes (user_id PK)
    ├──► hey_productos.user_id          [1 cliente → N productos]
    ├──► hey_transacciones.user_id      [1 cliente → N transacciones]
    └──► dataset_50k_anonymized.user_id [1 cliente → N turnos Havi]

hey_productos (producto_id PK)
    └──► hey_transacciones.producto_id  [1 producto → N transacciones]
```

### Integridad referencial verificada

| Check | Resultado |
|-------|-----------|
| user_id en productos → clientes | ✅ 0 huérfanos |
| user_id en transacciones → clientes | ✅ 0 huérfanos |
| user_id en conversaciones → clientes | ✅ 0 huérfanos |
| producto_id en transacciones → productos | ✅ 0 huérfanos |

Los **15,025 user_id** están presentes en las 4 tablas sin excepción.
Los **29,972 producto_id** en transacciones son subconjunto de los 38,909 en productos
(8,937 productos no tienen ninguna transacción en el período — normal).

### Joins recomendados

```python
# Clientes + Productos
clientes_productos = df_clientes.merge(df_productos, on="user_id", how="left")

# Transacciones enriquecidas (join completo)
df_full = (
    df_transacc
    .merge(df_productos[["producto_id","tipo_producto","estatus",
                          "limite_credito","saldo_actual","utilizacion_pct"]],
           on="producto_id", how="left")
    .merge(df_clientes, on="user_id", how="left", suffixes=("_txn","_cli"))
)

# Conversaciones + perfil de cliente
convs_enriquecido = df_convs.merge(df_clientes, on="user_id", how="left")
```

---

## 4. Esquema detallado por tabla

### 4.1 hey_clientes — demografía y perfil

| Columna | Tipo pandas | Descripción | Valores / Rango |
|---------|------------|-------------|-----------------|
| `user_id` | str | PK — identificador único | `USR-00001` … `USR-15025` |
| `edad` | int | Edad en años | 18–60 · media: 37.2 |
| `sexo` | str | Género | `M`=48.5% · `H`=47.6% · `SE`=3.9% |
| `estado` | str | Estado de residencia | 32 estados MX · 2.9% nulos |
| `ciudad` | str | Ciudad de residencia | 2.9% nulos |
| `nivel_educativo` | str | Último nivel de estudios | `Licenciatura`=44% · `Preparatoria`=29% · `Posgrado`=17% · `Secundaria`=10% |
| `ocupacion` | str | Situación laboral | `Empleado`=57% · `Independiente`=22% · `Empresario`=11% · `Estudiante`=6% · `Desempleado`=3% · `Jubilado`=1% |
| `ingreso_mensual_mxn` | int | Ingreso mensual en MXN | p25=$16k · p50=$24k · p75=$37k · media=$29,794 |
| `antiguedad_dias` | int | Días desde apertura | media: 935 días (~2.6 años) |
| `es_hey_pro` | bool | Suscripción Hey Pro activa | `True`=48.9% · `False`=51.1% |
| `nomina_domiciliada` | bool | Nómina en Hey Banco | `True`=34.1% |
| `canal_apertura` | str | Canal de apertura | `App`=81.1% · `Fan Shop`=18.9% |
| `score_buro` | int | Score crediticio | 295–850 · media: 618 |
| `dias_desde_ultimo_login` | int | Días sin login | 0–180 |
| `preferencia_canal` | str | Canal más usado | `app_ios`=44.2% · `app_android`=40.8% · `app_huawei`=15.0% |
| `satisfaccion_1_10` | float | NPS 1–10 | media: 7.48 · **5.0% nulos** |
| `recibe_remesas` | bool | Recibe remesas internacionales | `True`=8.3% |
| `usa_hey_shop` | bool | Compras en Hey Shop | `True`=28.3% |
| `idioma_preferido` | str | Idioma de la app | `es_MX`=mayoría · `en_US`=minoría |
| `tiene_seguro` | bool | Al menos un seguro activo | `True`=27.6% |
| `num_productos_activos` | int | Productos activos actuales | — |
| `patron_uso_atipico` | bool | Actividad inusual detectada | `True`=5.1% (763 clientes) |

### 4.2 hey_productos — portafolio por usuario

| Columna | Tipo pandas | Descripción | Nulos |
|---------|------------|-------------|-------|
| `producto_id` | str | PK | — |
| `user_id` | str | FK → hey_clientes | — |
| `tipo_producto` | str | Ver catálogo abajo | — |
| `fecha_apertura` | datetime | Fecha de contratación | — |
| `estatus` | str | `activo`=86.2% · `cancelado`=7.5% · `suspendido`=3.7% · `revision_de_pagos`=2.6% | — |
| `limite_credito` | float | Límite en MXN (solo crédito) | **63.2% nulos** — estructural |
| `saldo_actual` | float | Saldo/deuda/inversión | 9.6% nulos (seguros) |
| `utilizacion_pct` | float | Uso de crédito 0–1 · media: 0.433 | **63.2% nulos** — estructural |
| `tasa_interes_anual` | float | CAT anual | **51.7% nulos** — estructural |
| `plazo_meses` | int | Plazo de préstamo | **88.3% nulos** — solo préstamos |
| `monto_mensualidad` | float | Mensualidad | **88.3% nulos** — solo préstamos |
| `fecha_ultimo_movimiento` | datetime | Último movimiento | — |

**Catálogo tipo_producto:**

| Tipo | N | % del total |
|------|--:|------------|
| `cuenta_debito` | 15,025 | 38.6% — **todos los usuarios tienen una** |
| `tarjeta_credito_hey` | 7,565 | 19.4% |
| `inversion_hey` | 4,474 | 11.5% |
| `seguro_vida` | 2,480 | 6.4% |
| `credito_nomina` | 2,044 | 5.3% |
| `credito_personal` | 1,549 | 4.0% |
| `cuenta_negocios` | 1,343 | 3.5% |
| `seguro_compras` | 1,270 | 3.3% |
| `tarjeta_credito_negocios` | 1,111 | 2.9% |
| `tarjeta_credito_garantizada` | 1,091 | 2.8% |
| `credito_auto` | 957 | 2.5% |

### 4.3 hey_transacciones — historial de movimientos

| Columna | Tipo pandas | Descripción | Nulos |
|---------|------------|-------------|-------|
| `transaccion_id` | str | PK | — |
| `user_id` | str | FK → hey_clientes | — |
| `producto_id` | str | FK → hey_productos | — |
| `fecha_hora` | datetime | Fecha y hora exacta | — |
| `tipo_operacion` | str | Ver catálogo abajo | — |
| `canal` | str | Canal de la operación | — |
| `monto` | float | Importe MXN · mediana=$1,740 · p95=$24,000 | — |
| `comercio_nombre` | str | Nombre del comercio | **46.2% nulos** — ops sin comercio |
| `categoria_mcc` | str | Categoría del comercio | — |
| `ciudad_transaccion` | str | Ciudad del movimiento | 2.4% nulos |
| `estatus` | str | Estado final | — |
| `motivo_no_procesada` | str | Motivo de fallo | **96.7% nulos** — solo si no_procesada |
| `intento_numero` | int | Número de intento (>1 = reintento) | — |
| `meses_diferidos` | int | Meses sin intereses (MSI) | **97.8% nulos** — solo compras MSI |
| `cashback_generado` | float | Cashback generado | **77.5% nulos** — solo Hey Pro + completada |
| `descripcion_libre` | str | Texto libre del movimiento | 7.7% nulos |
| `hora_del_dia` | int | Hora 0–23 | — |
| `dia_semana` | str | Día en inglés | — |
| `es_internacional` | bool | Fuera de México | `True`=5.0% |
| `dispositivo` | str | Dispositivo app | 25.2% nulos (canales no-app) |
| `patron_uso_atipico` | bool | Actividad inusual | `True`=5.2% (41,492 txn) |

**Estatus de transacciones:**

| Estatus | N | % |
|---------|--:|---|
| `completada` | 748,267 | 93.3% |
| `no_procesada` | 26,609 | 3.3% |
| `en_disputa` | 19,033 | 2.4% |
| `revertida` | 8,475 | 1.1% |

**Top tipo_operacion:**

| Operación | N | % |
|-----------|--:|---|
| `compra` | 319,524 | 39.8% |
| `transf_entrada` | 92,167 | 11.5% |
| `transf_salida` | 90,116 | 11.2% |
| `cargo_recurrente` | 67,249 | 8.4% |
| `pago_credito` | 51,651 | 6.4% |
| `pago_servicio` | 48,562 | 6.1% |
| `abono_inversion` | 41,769 | 5.2% |
| `retiro_cajero` | 38,989 | 4.9% |

**Top categoría_mcc:**

| Categoría | N |
|-----------|--:|
| `transferencia` | 367,049 |
| `servicios_digitales` | 92,557 |
| `restaurante` | 75,493 |
| `supermercado` | 63,011 |
| `gobierno` | 61,401 |

**Canal de transacción:**

| Canal | N | % |
|-------|--:|---|
| `app_ios` | 268,313 | 33.4% |
| `app_android` | 226,431 | 28.2% |
| `pos_fisico` | 110,411 | 13.8% |
| `app_huawei` | 105,577 | 13.2% |
| `cajero_banregio` | 26,526 | 3.3% |
| `codi` | 26,354 | 3.3% |

### 4.4 dataset_50k_anonymized — conversaciones Havi

| Columna | Tipo pandas | Descripción | Notas |
|---------|------------|-------------|-------|
| `input` | str | Mensaje del usuario a Havi | Texto en español · puede tener encoding issues |
| `output` | str | Respuesta de Havi | Texto en español |
| `date` | datetime | Fecha y hora de la interacción | Parsear con `format="mixed"` |
| `conv_id` | str | Identificador de conversación (UUID) | Agrupa turnos de la misma sesión |
| `user_id` | str | FK → hey_clientes.user_id | 15,025 usuarios únicos |
| `channel_source` | str | Canal | `"1"`=texto (93.9%) · `"2"`=voz (6.1%) |

**Métricas de conversaciones:**

| Métrica | Valor |
|---------|-------|
| Turnos totales | 49,999 |
| Conversaciones únicas | 24,119 |
| Usuarios únicos | 15,025 (todos los clientes) |
| Turnos / conversación (media) | 2.07 |
| Conversaciones / usuario (media) | 1.61 |
| Período | 2025-01-07 → 2025-11-28 |

---

## 5. Guía de nulos — cuándo imputar vs. filtrar

| Columna(s) | % nulos | Tipo | Recomendación |
|-----------|---------|------|---------------|
| `limite_credito`, `utilizacion_pct` | 63.2% | Estructural | **No imputar.** Filtrar a productos de crédito antes de usar. |
| `tasa_interes_anual` | 51.7% | Estructural | **No imputar.** Solo válido para productos con interés. |
| `plazo_meses`, `monto_mensualidad` | 88.3% | Estructural | **No imputar.** Solo préstamos. |
| `motivo_no_procesada` | 96.7% | Estructural | **No imputar.** Filtrar a `estatus == "no_procesada"` antes de usar. |
| `cashback_generado` | 77.5% | Estructural | Nulo = no aplica cashback. Nunca imputar con 0 — usar `fillna(0)` solo al sumar totales. |
| `meses_diferidos` | 97.8% | Estructural | Nulo = sin MSI. Tratar como `False`. |
| `comercio_nombre` | 46.2% | Estructural | Nulo en transferencias, pagos, retiros. Filtrar por `tipo_operacion == "compra"` antes de analizar. |
| `dispositivo` | 25.2% | Estructural | Nulo cuando canal no es app. Filtrar por `canal.str.startswith("app")`. |
| `satisfaccion_1_10` | 5.0% | Faltante | Imputar con mediana (7.0) o excluir en análisis de NPS. |
| `estado`, `ciudad` | 2.9% | Faltante | Imputar con `"Desconocido"` o excluir en análisis geográfico. |

---

## 6. Segmentos y variables estratégicas

### Segmentos de usuario listos para usar

```python
# Hey Pro vs. no-Pro
hey_pro     = df_clientes[df_clientes["es_hey_pro"] == True]   # 7,345 usuarios
no_hey_pro  = df_clientes[df_clientes["es_hey_pro"] == False]  # 7,680 usuarios

# Usuarios con nómina domiciliada
nomina      = df_clientes[df_clientes["nomina_domiciliada"] == True]  # 5,128

# Usuarios con patrón atípico
atipicos    = df_clientes[df_clientes["patron_uso_atipico"] == True]  # 763

# Usuarios que reciben remesas
remesas     = df_clientes[df_clientes["recibe_remesas"] == True]  # 1,251

# Segmento Huawei (diferente UX)
huawei      = df_clientes[df_clientes["preferencia_canal"] == "app_huawei"]  # 2,248
```

### Variables predictoras más informativas (por tarea)

| Tarea analítica | Variables clave sugeridas |
|----------------|--------------------------|
| Churn / abandono | `antiguedad_dias`, `dias_desde_ultimo_login`, `satisfaccion_1_10`, `num_productos_activos` |
| Propensión a crédito | `score_buro`, `ingreso_mensual_mxn`, `ocupacion`, `nomina_domiciliada`, `utilizacion_pct` |
| Fraude / atipicidad | `patron_uso_atipico`, `es_internacional`, `intento_numero`, `estatus`, `motivo_no_procesada` |
| Cross-sell / upsell | `es_hey_pro`, `num_productos_activos`, `tipo_producto`, `usa_hey_shop`, `tiene_seguro` |
| Análisis de gasto | `categoria_mcc`, `tipo_operacion`, `monto`, `canal`, `dia_semana`, `hora_del_dia` |
| NPS / satisfacción | `satisfaccion_1_10`, conversaciones Havi (`input`/`output`), `canal_apertura` |
| Remesas | `recibe_remesas`, `es_internacional`, `tipo_operacion == "transf_entrada"` |

---

## 7. Alertas y gotchas para agentes

1. **El campo `sexo` en hey_clientes.csv se llama `sexo`, no `genero`** como indica el diccionario oficial. Usar `df_clientes["sexo"]`.

2. **`channel_source` en conversaciones es string `"1"` y `"2"`**, no entero, después de cargar con pandas. Comparar con `== "1"`, no `== 1`.

3. **`date` en el parquet tiene nanosegundos** (`"2025-01-07 06:59:47.886303376"`). Parsear con `pd.to_datetime(df_convs["date"], format="mixed")`.

4. **Los nulos en `cashback_generado` NO son 0** — son operaciones donde el cashback no aplica. Usar `fillna(0)` solo para sumas totales, nunca para promedios.

5. **8,937 productos sin transacciones** — un LEFT join `productos → transacciones` dará NaN en columnas de transacción. Filtrar si solo interesa el subconjunto activo.

6. **`patron_uso_atipico` existe en dos tablas** (`hey_clientes` y `hey_transacciones`) con significados distintos: en clientes es a nivel de usuario; en transacciones es a nivel de movimiento individual.

7. **Textos del parquet pueden tener problemas de encoding** (caracteres `\ufffd`). Normalizar con `unicodedata.normalize` o usar `errors="replace"` si se vectoriza.

8. **La columna `es_dato_sintetico`** aparece en algunos CSVs como artefacto de generación. Eliminarla antes de modelar.

---

## 8. Métricas de referencia rápida

| Métrica | Valor |
|---------|-------|
| Clientes totales | 15,025 |
| Edad media | 37.2 años |
| Ingreso mensual mediana | $24,000 MXN |
| Score Buró medio | 618 / 850 |
| Productos por cliente (media) | 2.59 |
| Utilización promedio de crédito | 43.3% |
| Transacciones por cliente (media) | 53.4 |
| Monto mediano por txn | $1,740 MXN |
| Monto promedio por txn | $6,108 MXN |
| % txn completadas | 93.3% |
| % txn con patrón atípico | 5.2% |
| % txn internacionales | 5.0% |
| Cashback total generado | $2,670,792 MXN |
| Conversaciones Havi por usuario (media) | 1.61 |
| Turnos por conversación (media) | 2.07 |
| NPS medio (satisfaccion_1_10) | 7.48 / 10 |

---

*Hey Banco · Datathon 2026 · Tarea 0 completada · Notebook: `01_eda_carga_datos.ipynb`*
