# UC1 — Casos edge del trigger proactivo

Casos reales del dataset que documentan el comportamiento esperado de la regla.

## Caso 1: Múltiples productos cubren el monto

- **transaccion_id**: `TXN-0000594159`
- **user_id**: `USR-11118`
- **monto**: `1088.63`
- **productos_disponibles**: `[{'tipo_producto': 'cuenta_debito', 'saldo_actual': 36993.0}, {'tipo_producto': 'credito_nomina', 'saldo_actual': 31638.6}]`
- **producto_elegido**: `{'producto_id': 'PRD-00028788', 'tipo_producto': 'cuenta_debito', 'saldo_actual': 36993.0, 'prioridad': 1}`
- **expectativa**: `cuenta_debito tiene prioridad 1, debe ser elegido sobre inversion_hey (prio 2)`

## Caso 2: Monto justo en el umbral $50

- **transaccion_id**: `TXN-0000660290`
- **monto**: `49.36`
- **trigger_activado**: `False`
- **motivo_no_disparo**: `monto_bajo_umbral`
- **expectativa**: `monto >= 50 dispara; monto < 50 se filtra como ruido`

## Caso 3: Múltiples rechazos en 24h del mismo usuario

- **user_id**: `USR-00345`
- **eventos**: `[{'txn': 'TXN-0000018658', 'fecha': '2025-04-30 07:19:00', 'trigger': False, 'no_disparo': 'motivo_fuera_de_alcance'}, {'txn': 'TXN-0000018648', 'fecha': '2025-04-30 22:17:00', 'trigger': True, 'no_disparo': None}, {'txn': 'TXN-0000018673', 'fecha': '2025-09-12 22:54:18', 'trigger': False, 'no_disparo': 'motivo_fuera_de_alcance'}]`
- **expectativa**: `solo el primer trigger del día dispara; los siguientes se silencian con motivo "frecuencia_excedida_24h"`

## Caso 4: Producto alternativo con saldo suficiente pero estatus inactivo

- **transaccion_id**: `TXN-0000448919`
- **monto**: `40500.0`
- **productos_no_activos_que_cubrian**: `[{'tipo_producto': 'inversion_hey', 'estatus': 'suspendido', 'saldo_actual': 139274.54}]`
- **trigger_activado**: `False`
- **motivo_no_disparo**: `motivo_fuera_de_alcance`
- **expectativa**: `NO debe dispararse: solo se consideran productos en estatus="activo"`

## Caso 5: monto_faltante == 0 (saldo origen ya cubre, falla por otra razón ej. límite)

- **transaccion_id**: `TXN-0000000050`
- **monto**: `349.0`
- **feat_monto_faltante**: `0.0`
- **motivo_no_procesada**: `saldo_insuficiente`
- **trigger_activado**: `True`
- **expectativa**: `puede dispararse si hay alternativo y motivo está en alcance; representa rechazos por limite_excedido más que por saldo`

