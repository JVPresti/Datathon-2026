# UC1 · Asistente Financiero Proactivo — Findings

> **Owner**: Fernando Haro · **Output esperado**: JSON de alertas con `alert_type`, `message`, `priority`, `recommended_action`.
> **Fuentes**: `notebooks/uc1/01_eda_rechazos.ipynb`, `notebooks/eda/03_eda_transacciones_dq.ipynb`, `notebooks/uc4/02_eda_atipicas.ipynb`, `notebooks/uc3/01_analisis_portafolio_productos.ipynb`.

---

## 1. Universo y oportunidad

| Concepto | Valor |
|---|---:|
| Transacciones totales | 802,384 |
| `no_procesada` (rechazo total) | **26,609** (3.32 %) |
| **Rechazos UC1-resolubles** (`saldo_insuficiente` ∪ `limite_excedido`) | **6,638** (0.83 % del total · **24.9 %** de los rechazos) |
| Usuarios afectados | **5,079** únicos |
| · 1 rechazo | 75.7 % |
| · 2 rechazos | 19.1 % |
| · ≥ 3 rechazos ("crónicos") | **5.2 %** (≈ 264 usuarios) |
| `en_disputa` | 19,033 (2.37 %) — siguiente fuente de alertas |
| `revertida` | 8,475 (1.06 %) |

> 🎯 **Tamaño del mercado UC1**: ~5k usuarios, ~6.6k eventos accionables. Suficiente para entrenar un clasificador de prioridad y para diseñar un mensaje por motivo.

## 2. Hallazgos sobre rechazos ✅

### 2.1 Distribución de motivos
Los 8 motivos de rechazo están **casi uniformes** entre sí (~12.4 % cada uno).

| Motivo | Resoluble por Havi | Acción sugerida |
|---|---|---|
| `saldo_insuficiente` | ✅ Sí | Sugerir transferencia desde `inversion_hey` o aviso pre-vencimiento |
| `limite_excedido` | ✅ Sí | Sugerir aumento de línea o pago de TC |
| `monto_excede_limite_diario` | ⚠️ Parcial | Sugerir cambio de límite en app |
| `tarjeta_bloqueada` | ❌ Operativo | Redirigir a soporte |
| `datos_invalidos` | ❌ Operativo | Redirigir a soporte |
| `timeout_banco` | ❌ Sistema | Reintentar |
| `codigo_incorrecto` | ❌ Operativo | Sin acción |
| `cuenta_destino_invalida` | ❌ Operativo | Validar destino |

### 2.2 Estadística del monto en rechazos UC1 (saldo + límite)
| Estadístico | MXN |
|---|---:|
| n | 6,638 |
| media | 5,446 |
| mediana | 1,500 |
| p90 | 17,393 |
| std | 9,018 |
| max | 79,140 |

> Distribución muy sesgada → log1p antes de cualquier modelo.

### 2.3 Reintentos como señal dura ✅
- Total con `intento_numero > 1`: **17,720 (2.21 %)**.
- Distribución: intento 1 = 784,664 · intento 2 = 8,913 · intento 3 = 8,807.
- **Insight**: en el slice analizado, **100 % de los reintentos terminan en `no_procesada`** → reintento es sinónimo de fricción. Funciona como **label fuerte** o tier de riesgo para UC1.
- Reintentos por `tipo_operacion`: `compra` 6,892 · `transf_entrada` 1,917 · `transf_salida` 1,908.

### 2.4 Cobertura por inversión (oportunidad de auto-resolución) ⚠️
- 4,474 usuarios tienen `inversion_hey` activa (29.8 % de la base).
- Métricas pendientes (celdas no ejecutadas en `01_eda_rechazos.ipynb`): **% de usuarios con `saldo_insuficiente` cuyo `saldo_actual` en inversión cubre el rechazo**. Re-ejecutar para cuantificar.

## 3. Hallazgos sobre atipicidad / fraude ⚠️

> Notebook fuente: `notebooks/uc4/02_eda_atipicas.ipynb` (mayoría de outputs vacíos — re-ejecutar para confirmar números).

### 3.1 Volumen
- `patron_uso_atipico = True` a nivel transacción: **41,492 txn (5.17 %)**.
- `patron_uso_atipico = True` a nivel usuario: **763 clientes (5.1 %)**.

### 3.2 Hipótesis del autor (validar tras re-ejecución) 🧪
- Atípicos tienen **mayor share internacional** (vs base 5.0 %).
- Atípicos tienen **mayor share nocturno** (22:00–05:59).
- **Internacional + nocturno** combinado es la señal más fuerte.
- Atípicos tienen **más `en_disputa` y `no_procesada`** que la base.
- Mismatch entre `ciudad_transaccion` y ciudad de residencia es señal complementaria.

### 3.3 Cruce conversacional
- 1,936 turnos del parquet contienen palabras `mensualidad|pago automático|suscripción` (de `notebooks/uc2/02_eda_compromisos_financieros.ipynb`).
- Notebook UC4 atípicas detecta vocabulario `fraude|cargo no reconocido|desconozco` → cruzar usuarios que *escriben sobre fraude* con usuarios con `patron_uso_atipico = True`.

## 4. Catálogo de alertas (taxonomía propuesta)

Usar como base para el JSON output:

| `alert_type` | Trigger | `priority` | `recommended_action` |
|---|---|---|---|
| `rechazo_saldo` | `motivo == saldo_insuficiente` AND `monto > saldo_actual_debito` | **alta** si `inversion` cubre, media si no | "Transferir $X desde tu inversión" |
| `rechazo_limite` | `motivo == limite_excedido` AND `tipo_producto == tarjeta_credito_*` | media | "Liberá línea pagando $Y" |
| `rechazo_diario` | `motivo == monto_excede_limite_diario` | baja | "Subí tu límite diario en Configuración" |
| `disputa_abierta` | `estatus == en_disputa` AND > 7 días sin resolución | alta | "Te ayudo a dar seguimiento" |
| `txn_atipica` | `patron_uso_atipico = True` AND `es_internacional = True` AND nocturna | **crítica** | "¿Reconocés esta compra?" |
| `gasto_recurrente_anomalo` | `cargo_recurrente` cuyo `monto` se desvía > 2σ del histórico | media | "Tu Netflix subió $Z" |
| `liquidez_proxima` | proyección `saldo_debito - cargos_recurrentes_proximos_7d < 0` | alta | "Te quedan $W antes de cargos automáticos" |
| `cashback_proximo_perdido` | mismo trigger que UC3 (no-Pro con `compra > $Y`) | baja | (handoff a UC3) |

## 5. Implicaciones para Feature Engineering

### 5.1 Features a nivel **usuario** (input al ranker de prioridad)

| Feature | Cálculo | Fuente |
|---|---|---|
| `feat_n_rechazos_30d` | count `no_procesada` últimos 30d | transacciones |
| `feat_n_rechazos_uc1_30d` | count motivos resolubles | transacciones |
| `feat_es_cronico_uc1` | n_rechazos_uc1 ≥ 3 | derivada |
| `feat_pct_reintento` | reintentos / total tx | transacciones |
| `feat_tiene_inversion_activa` | bool | productos |
| `feat_saldo_inversion` | sum `saldo_actual` donde `tipo_producto=='inversion_hey'` | productos |
| `feat_cubre_rechazo_pendiente` | `saldo_inversion > monto_max_rechazo_pendiente` | join |
| `feat_carga_fija` | sum `monto_mensualidad` + sum `cargo_recurrente` | productos + transacciones |
| `feat_ratio_carga_ingreso` | `feat_carga_fija / ingreso_mensual_mxn` | join clientes |
| `feat_dist_dias_ult_rechazo` | days since last `no_procesada` | transacciones |

### 5.2 Features a nivel **transacción** (input al detector de anomalía)

| Feature | Cálculo |
|---|---|
| `feat_log_monto` | `log1p(monto)` |
| `feat_z_monto_mcc_user` | (`monto` − media histórica del par user×mcc) / std |
| `feat_es_nocturna` | `hora_del_dia in [22,23,0..5]` |
| `feat_intl_x_nocturna` | `es_internacional AND feat_es_nocturna` |
| `feat_mismatch_ciudad` | `ciudad_transaccion != clientes.ciudad` |
| `feat_intento_n` | `intento_numero` raw |
| `feat_es_motivo_resoluble` | `motivo in {saldo_insuficiente, limite_excedido}` |
| `feat_dias_desde_ult_compra_mcc` | recency por MCC |

### 5.3 Modelos sugeridos

| Modelo | Tipo | Label |
|---|---|---|
| **Detector de anomalía** | IsolationForest / LightGBM bin. | `patron_uso_atipico` (txn-level) o reglas de negocio |
| **Clasificador de motivo** | LightGBM multiclase | `motivo_no_procesada` |
| **Ranker de prioridad** | Gradient Boosting o regla determinística | score 0-100 |
| **Predictor de liquidez** | regresión sobre saldo proyectado a 7d | NA |

## 6. Outputs del JSON (formato esperado)

```json
{
  "user_id": "USR-00042",
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
        "transaccion_id": "TXN-...",
        "fecha_hora": "2025-11-12T19:42:00",
        "motivo": "saldo_insuficiente",
        "es_cronico": false
      }
    }
  ]
}
```

## 7. Pendientes inmediatos antes de Feature Eng

- [ ] **Re-ejecutar** `notebooks/uc1/01_eda_rechazos.ipynb` (corregir bug de `pd.cut` con `bins` no monotónicos cuando `max == 5`).
- [ ] **Re-ejecutar** `notebooks/uc4/02_eda_atipicas.ipynb` para confirmar % nocturno / internacional / disputa en atípicos.
- [ ] **Cuantificar % de rechazos UC1 cubribles por `inversion_hey`** del usuario (celdas pendientes).
- [ ] **Definir ventana** de "alerta proactiva": ¿24h?, ¿7d?, ¿al instante?
- [ ] **Validar** que motivos están realmente uniformes o si hay sesgo por canal/MCC (puede ser artefacto).
