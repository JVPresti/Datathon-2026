"""Build and execute notebooks/uc1/21_model_trigger_uc1_fh.ipynb.

UC1 is a deterministic business rule, not an ML model. This notebook:
- Implements `evaluar_trigger_uc1(...)` with all conditions of the ticket
- Adds frequency control (1 notification / user / 24h)
- Adds product prioritization (cuenta_debito > inversion_hey > ...)
- Simulates over the historical rejection dataset and reports coverage
- Benchmarks latency (must be < 100 ms per evaluation)
- Documents 5 edge cases with real data
- Persists `outputs/uc1/uc1_trigger_metrics.json` and edge-cases markdown
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from _nb_helper import build_notebook, code, execute_notebook, md  # noqa: E402

NB_PATH = ROOT / "notebooks" / "uc1" / "21_model_trigger_uc1_fh.ipynb"


cells = [
    md(
        """# UC1 — Modelado: Regla de trigger de notificación proactiva

**Autor:** Fernando Haro (`fh`)
**Proyecto:** datamoles — Havi
**Tipo:** Regla determinista (no ML)
**SLA:** evaluación < 100 ms por transacción rechazada

## Objetivo

Implementar la lógica que decide cuándo Havi debe enviar una notificación tras un rechazo.
La regla minimiza falsos positivos: solo activa si hay una solución concreta disponible.

## Condiciones (ticket)

1. `estatus == 'no_procesada'`
2. `motivo IN ('saldo_insuficiente', 'limite_excedido')`
3. `monto >= 50` (filtro de ruido)
4. `feat_tiene_saldo_alternativo == True` AND `feat_monto_faltante <= feat_monto_disponible_alternativo`
5. **Frecuencia**: máximo 1 notificación por usuario en 24h
6. **Priorización**: `cuenta_debito > inversion_hey > tarjeta_credito_hey` (menor fricción)
"""
    ),
    md("---\n## 0. Setup"),
    code(
        """import pandas as pd
import numpy as np
import json
import time
from pathlib import Path
from datetime import timedelta

ROOT = Path('..').resolve().parent  # repo root
FEAT_DIR = ROOT / 'outputs' / 'features'
DATA_DIR = ROOT / 'Datathon_Hey_2026_dataset_transacciones 1' / 'dataset_transacciones'
OUT_DIR  = ROOT / 'outputs' / 'uc1'
OUT_DIR.mkdir(parents=True, exist_ok=True)

print('FEAT_DIR :', FEAT_DIR)
print('OUT_DIR  :', OUT_DIR)
"""
    ),
    md("## 1. Carga de datos"),
    code(
        """df_alertas = pd.read_parquet(FEAT_DIR / 'feat_uc1_alertas.parquet')
df_productos = pd.read_csv(DATA_DIR / 'hey_productos.csv', low_memory=False)

print('df_alertas   :', df_alertas.shape)
print('df_productos :', df_productos.shape)
print()
print('Columnas alertas relevantes para el trigger:')
trigger_cols = [
    'transaccion_id','user_id','fecha_hora','monto','estatus','motivo_no_procesada',
    'feat_tiene_saldo_alternativo','feat_monto_faltante','feat_monto_disponible_alternativo',
    'feat_producto_alternativo_id','feat_tipo_producto_alternativo'
]
df_alertas[trigger_cols].head(3)
"""
    ),
    md("## 2. Lógica del trigger\n\nDefinimos 3 funciones puras y reutilizables."),
    code(
        '''# Orden de preferencia: menor fricción para el usuario primero
PRIORIDAD_PRODUCTO = {
    'cuenta_debito':         1,
    'inversion_hey':         2,
    'tarjeta_credito_hey':   3,
    'cuenta_ahorro':         4,
    'credito_nomina':        5,
    'credito_personal':      6,
}

MOTIVOS_VALIDOS = {'saldo_insuficiente', 'limite_excedido'}
MONTO_MINIMO    = 50.0
VENTANA_FREQ_H  = 24


def priorizar_producto_alternativo(productos_usuario: pd.DataFrame, monto: float) -> dict | None:
    """Dado el portafolio activo de un usuario, devuelve el producto alternativo de menor fricción
    cuyo saldo cubre el monto. Si ninguno cubre, devuelve None.
    """
    if productos_usuario is None or len(productos_usuario) == 0:
        return None
    cand = productos_usuario[
        (productos_usuario['estatus'] == 'activo')
        & (productos_usuario['saldo_actual'] >= monto)
    ].copy()
    if len(cand) == 0:
        return None
    cand['_prio'] = cand['tipo_producto'].map(PRIORIDAD_PRODUCTO).fillna(99).astype(int)
    cand = cand.sort_values(['_prio', 'saldo_actual'], ascending=[True, False])
    best = cand.iloc[0]
    return {
        'producto_id'   : best['producto_id'],
        'tipo_producto' : best['tipo_producto'],
        'saldo_actual'  : float(best['saldo_actual']),
        'prioridad'     : int(best['_prio']),
    }


def evaluar_trigger_uc1(
    txn: pd.Series,
    productos_usuario: pd.DataFrame,
    last_trigger_by_user: dict[str, pd.Timestamp] | None = None,
) -> dict:
    """Evalúa si una transacción rechazada debe disparar notificación proactiva de Havi.

    Devuelve un dict con `trigger` (bool) + `motivo_no_disparo` (str | None) + `producto_alternativo` (dict | None).
    """
    out = {'trigger': False, 'motivo_no_disparo': None, 'producto_alternativo': None}

    if txn.get('estatus') != 'no_procesada':
        out['motivo_no_disparo'] = 'estatus_no_es_rechazo'
        return out
    if txn.get('motivo_no_procesada') not in MOTIVOS_VALIDOS:
        out['motivo_no_disparo'] = 'motivo_fuera_de_alcance'
        return out
    if pd.isna(txn.get('monto')) or float(txn['monto']) < MONTO_MINIMO:
        out['motivo_no_disparo'] = 'monto_bajo_umbral'
        return out

    # Producto alternativo (en línea, en caso de que feat_* esté ausente)
    alt = priorizar_producto_alternativo(productos_usuario, float(txn['monto']))
    if alt is None:
        out['motivo_no_disparo'] = 'sin_producto_alternativo_que_cubra'
        return out

    # Control de frecuencia
    if last_trigger_by_user is not None:
        prev = last_trigger_by_user.get(txn['user_id'])
        if prev is not None:
            delta = txn['fecha_hora'] - prev
            if delta < timedelta(hours=VENTANA_FREQ_H):
                out['motivo_no_disparo'] = 'frecuencia_excedida_24h'
                out['producto_alternativo'] = alt
                return out

    out['trigger'] = True
    out['producto_alternativo'] = alt
    return out
'''
    ),
    md("## 3. Simulación sobre el dataset histórico\n\nAplicamos la regla a las 60,728 alertas + ~6,059 rechazos para medir cobertura."),
    code(
        """# Pre-calcular el portafolio por usuario para acceso O(1)
prods_by_user = {
    uid: g[['producto_id','tipo_producto','saldo_actual','estatus']].copy()
    for uid, g in df_productos.groupby('user_id')
}
print(f'Portafolio cargado para {len(prods_by_user):,} usuarios')

# Filtrar alertas a los rechazos candidatos
rechazos = df_alertas[df_alertas['estatus'] == 'no_procesada'].copy()
rechazos = rechazos.sort_values('fecha_hora').reset_index(drop=True)
print(f'Total rechazos                     : {len(rechazos):,}')
print(f'  por saldo_insuficiente           : {(rechazos["motivo_no_procesada"]=="saldo_insuficiente").sum():,}')
print(f'  por limite_excedido              : {(rechazos["motivo_no_procesada"]=="limite_excedido").sum():,}')
print(f'  con monto >= $50                 : {(rechazos["monto"] >= 50).sum():,}')
"""
    ),
    code(
        """%%time
last_trigger_by_user: dict[str, pd.Timestamp] = {}
results = []

for _, row in rechazos.iterrows():
    res = evaluar_trigger_uc1(row, prods_by_user.get(row['user_id']), last_trigger_by_user)
    if res['trigger']:
        last_trigger_by_user[row['user_id']] = row['fecha_hora']
    results.append(res['trigger'])
    
rechazos['trigger_activado']   = results
n_triggers   = int(rechazos['trigger_activado'].sum())
n_rechazos   = len(rechazos)
cobertura    = n_triggers / n_rechazos if n_rechazos else 0
print(f'Triggers activados                 : {n_triggers:,} de {n_rechazos:,}  ({cobertura:.1%})')
"""
    ),
    code(
        """# Breakdown por motivo + diagnóstico de no-disparo (re-simulando sin frec para ver capacidad bruta)
diag = []
for _, row in rechazos.iterrows():
    res = evaluar_trigger_uc1(row, prods_by_user.get(row['user_id']), None)
    diag.append(res['motivo_no_disparo'] or 'TRIGGER')

rechazos['_diag'] = diag

print('Distribución bruta (sin freq control):')
print(rechazos['_diag'].value_counts().to_string())

print('\\nBreakdown por motivo entre los que activan trigger:')
print(rechazos[rechazos['trigger_activado']]['motivo_no_procesada'].value_counts().to_string())
"""
    ),
    md("## 4. Benchmark de latencia\n\nObjetivo: < 100 ms por evaluación. Mock del cache de productos en memoria (equivalente a Redis L1)."),
    code(
        """# Sample de 1,000 rechazos aleatorios
sample = rechazos.sample(1000, random_state=42).reset_index(drop=True)

times_us = []
for _, row in sample.iterrows():
    t0 = time.perf_counter_ns()
    evaluar_trigger_uc1(row, prods_by_user.get(row['user_id']), {})
    t1 = time.perf_counter_ns()
    times_us.append((t1 - t0) / 1000.0)  # microsegundos

times_us = np.array(times_us)
p50 = np.percentile(times_us, 50)
p95 = np.percentile(times_us, 95)
p99 = np.percentile(times_us, 99)

print(f'Latencia (n=1,000 evaluaciones, productos cacheados en RAM):')
print(f'  P50  : {p50:8.1f} µs  ({p50/1000:.3f} ms)')
print(f'  P95  : {p95:8.1f} µs  ({p95/1000:.3f} ms)')
print(f'  P99  : {p99:8.1f} µs  ({p99/1000:.3f} ms)')
print(f'  max  : {times_us.max():8.1f} µs  ({times_us.max()/1000:.3f} ms)')
print(f'\\n  SLA P95 < 100 ms: {"OK" if p95/1000 < 100 else "FAIL"}')
"""
    ),
    md("## 5. Casos edge — 5 escenarios reales"),
    code(
        """edge_cases = []

# Edge 1 — múltiples productos cubren el monto: validar priorización cuenta_debito > inversion_hey
def find_multi_alt():
    for _, r in rechazos.iterrows():
        u = prods_by_user.get(r['user_id'])
        if u is None:
            continue
        cubren = u[(u['estatus']=='activo') & (u['saldo_actual'] >= r['monto'])]
        if cubren['tipo_producto'].nunique() >= 2:
            return r, cubren
    return None, None

r1, prods1 = find_multi_alt()
if r1 is not None:
    res = evaluar_trigger_uc1(r1, prods1, {})
    edge_cases.append({
        'caso': 'Múltiples productos cubren el monto',
        'transaccion_id': r1['transaccion_id'],
        'user_id': r1['user_id'],
        'monto': float(r1['monto']),
        'productos_disponibles': prods1[['tipo_producto','saldo_actual']].to_dict('records'),
        'producto_elegido': res['producto_alternativo'],
        'expectativa': 'cuenta_debito tiene prioridad 1, debe ser elegido sobre inversion_hey (prio 2)',
    })

# Edge 2 — monto justo en el umbral $50
r2 = rechazos[(rechazos['monto'] >= 49) & (rechazos['monto'] <= 51)].head(1)
if len(r2):
    r2 = r2.iloc[0]
    res = evaluar_trigger_uc1(r2, prods_by_user.get(r2['user_id']), {})
    edge_cases.append({
        'caso': 'Monto justo en el umbral $50',
        'transaccion_id': r2['transaccion_id'],
        'monto': float(r2['monto']),
        'trigger_activado': res['trigger'],
        'motivo_no_disparo': res['motivo_no_disparo'],
        'expectativa': 'monto >= 50 dispara; monto < 50 se filtra como ruido',
    })

# Edge 3 — usuario con > 1 rechazo en 24h: verificar que solo el primero dispare
def find_multi_rechazos_24h():
    for uid, g in rechazos.groupby('user_id'):
        if len(g) < 2:
            continue
        g = g.sort_values('fecha_hora')
        diffs = g['fecha_hora'].diff().dt.total_seconds() / 3600
        if (diffs < 24).any():
            return g
    return None

g3 = find_multi_rechazos_24h()
if g3 is not None:
    cache = {}
    rs = []
    for _, row in g3.iterrows():
        res = evaluar_trigger_uc1(row, prods_by_user.get(row['user_id']), cache)
        if res['trigger']:
            cache[row['user_id']] = row['fecha_hora']
        rs.append((row['transaccion_id'], row['fecha_hora'], res['trigger'], res['motivo_no_disparo']))
    edge_cases.append({
        'caso': 'Múltiples rechazos en 24h del mismo usuario',
        'user_id': g3['user_id'].iloc[0],
        'eventos': [{'txn': t, 'fecha': str(f), 'trigger': bool(tr), 'no_disparo': nd} for (t,f,tr,nd) in rs],
        'expectativa': 'solo el primer trigger del día dispara; los siguientes se silencian con motivo "frecuencia_excedida_24h"',
    })

# Edge 4 — producto alternativo en estatus distinto a "activo"
def find_alt_inactivo():
    for _, r in rechazos.iterrows():
        u = prods_by_user.get(r['user_id'])
        if u is None:
            continue
        inact_que_cubren = u[(u['estatus'] != 'activo') & (u['saldo_actual'] >= r['monto'])]
        act_que_cubren   = u[(u['estatus'] == 'activo') & (u['saldo_actual'] >= r['monto'])]
        if len(inact_que_cubren) > 0 and len(act_que_cubren) == 0:
            return r, u
    return None, None

r4, u4 = find_alt_inactivo()
if r4 is not None:
    res = evaluar_trigger_uc1(r4, u4, {})
    edge_cases.append({
        'caso': 'Producto alternativo con saldo suficiente pero estatus inactivo',
        'transaccion_id': r4['transaccion_id'],
        'monto': float(r4['monto']),
        'productos_no_activos_que_cubrian': u4[(u4['estatus']!='activo') & (u4['saldo_actual']>=r4['monto'])][['tipo_producto','estatus','saldo_actual']].to_dict('records'),
        'trigger_activado': res['trigger'],
        'motivo_no_disparo': res['motivo_no_disparo'],
        'expectativa': 'NO debe dispararse: solo se consideran productos en estatus="activo"',
    })

# Edge 5 — monto_faltante == 0 (saldo origen ya cubre el monto, falla por otra razón)
r5 = df_alertas[(df_alertas['estatus']=='no_procesada') &
                (df_alertas['feat_monto_faltante']==0) &
                (df_alertas['monto']>=50)].head(1)
if len(r5):
    r5 = r5.iloc[0]
    res = evaluar_trigger_uc1(r5, prods_by_user.get(r5['user_id']), {})
    edge_cases.append({
        'caso': 'monto_faltante == 0 (saldo origen ya cubre, falla por otra razón ej. límite)',
        'transaccion_id': r5['transaccion_id'],
        'monto': float(r5['monto']),
        'feat_monto_faltante': float(r5['feat_monto_faltante']),
        'motivo_no_procesada': r5['motivo_no_procesada'],
        'trigger_activado': res['trigger'],
        'expectativa': 'puede dispararse si hay alternativo y motivo está en alcance; representa rechazos por limite_excedido más que por saldo',
    })

print(f'Edge cases documentados: {len(edge_cases)}')
for ec in edge_cases:
    print(' -', ec['caso'])
"""
    ),
    md("## 6. Persistir métricas + edge cases"),
    code(
        '''metrics = {
    'fecha_evaluacion'      : pd.Timestamp.utcnow().isoformat(),
    'n_rechazos_total'      : int(n_rechazos),
    'n_rechazos_saldo'      : int((rechazos['motivo_no_procesada']=='saldo_insuficiente').sum()),
    'n_rechazos_limite'     : int((rechazos['motivo_no_procesada']=='limite_excedido').sum()),
    'n_triggers_activados'  : int(n_triggers),
    'cobertura_pct'         : round(cobertura * 100, 2),
    'latencia_us': {
        'p50': float(p50),
        'p95': float(p95),
        'p99': float(p99),
        'max': float(times_us.max()),
    },
    'cumple_sla_p95_100ms'  : bool(p95 / 1000 < 100),
    'breakdown_no_disparo'  : rechazos['_diag'].value_counts().to_dict(),
    'breakdown_motivo_disparo': rechazos[rechazos['trigger_activado']]['motivo_no_procesada'].value_counts().to_dict(),
    'parametros': {
        'MONTO_MINIMO_MXN'     : MONTO_MINIMO,
        'VENTANA_FRECUENCIA_H' : VENTANA_FREQ_H,
        'MOTIVOS_VALIDOS'      : sorted(MOTIVOS_VALIDOS),
        'PRIORIDAD_PRODUCTO'   : PRIORIDAD_PRODUCTO,
    }
}

with open(OUT_DIR / 'uc1_trigger_metrics.json', 'w', encoding='utf-8') as f:
    json.dump(metrics, f, indent=2, default=str, ensure_ascii=False)
print('Wrote', OUT_DIR / 'uc1_trigger_metrics.json')

# Edge cases
with open(OUT_DIR / 'uc1_trigger_edge_cases.md', 'w', encoding='utf-8') as f:
    f.write('# UC1 — Casos edge del trigger proactivo\\n\\n')
    f.write('Casos reales del dataset que documentan el comportamiento esperado de la regla.\\n\\n')
    for i, ec in enumerate(edge_cases, 1):
        f.write(f'## Caso {i}: {ec["caso"]}\\n\\n')
        for k, v in ec.items():
            if k == 'caso':
                continue
            f.write(f'- **{k}**: `{v}`\\n')
        f.write('\\n')
print('Wrote', OUT_DIR / 'uc1_trigger_edge_cases.md')
'''
    ),
    md("## 7. Función exportable para el backend\n\nBloque copy-paste para integrar en FastAPI / job de tiempo real."),
    code(
        '''BACKEND_SNIPPET = """
# ─── Trigger UC1 — copiar a backend FastAPI ──────────────────────────────────
from datetime import timedelta
import pandas as pd

PRIORIDAD_PRODUCTO = {
    'cuenta_debito':         1,
    'inversion_hey':         2,
    'tarjeta_credito_hey':   3,
    'cuenta_ahorro':         4,
    'credito_nomina':        5,
    'credito_personal':      6,
}
MOTIVOS_VALIDOS = {'saldo_insuficiente', 'limite_excedido'}
MONTO_MINIMO    = 50.0
VENTANA_FREQ_H  = 24

def priorizar_producto_alternativo(productos_usuario: pd.DataFrame, monto: float):
    if productos_usuario is None or len(productos_usuario) == 0:
        return None
    cand = productos_usuario[(productos_usuario['estatus']=='activo')
                             & (productos_usuario['saldo_actual'] >= monto)].copy()
    if len(cand) == 0:
        return None
    cand['_prio'] = cand['tipo_producto'].map(PRIORIDAD_PRODUCTO).fillna(99).astype(int)
    cand = cand.sort_values(['_prio','saldo_actual'], ascending=[True, False])
    best = cand.iloc[0]
    return {'producto_id': best['producto_id'], 'tipo_producto': best['tipo_producto'],
            'saldo_actual': float(best['saldo_actual'])}

def evaluar_trigger_uc1(txn, productos_usuario, last_trigger_by_user):
    if txn.get('estatus') != 'no_procesada':
        return {'trigger': False, 'motivo_no_disparo': 'estatus_no_es_rechazo'}
    if txn.get('motivo_no_procesada') not in MOTIVOS_VALIDOS:
        return {'trigger': False, 'motivo_no_disparo': 'motivo_fuera_de_alcance'}
    if pd.isna(txn.get('monto')) or float(txn['monto']) < MONTO_MINIMO:
        return {'trigger': False, 'motivo_no_disparo': 'monto_bajo_umbral'}
    alt = priorizar_producto_alternativo(productos_usuario, float(txn['monto']))
    if alt is None:
        return {'trigger': False, 'motivo_no_disparo': 'sin_producto_alternativo_que_cubra'}
    if last_trigger_by_user is not None:
        prev = last_trigger_by_user.get(txn['user_id'])
        if prev is not None and (txn['fecha_hora'] - prev) < timedelta(hours=VENTANA_FREQ_H):
            return {'trigger': False, 'motivo_no_disparo': 'frecuencia_excedida_24h',
                    'producto_alternativo': alt}
    return {'trigger': True, 'producto_alternativo': alt}
# ──────────────────────────────────────────────────────────────────────────────
"""
print(BACKEND_SNIPPET)
'''
    ),
]


if __name__ == "__main__":
    build_notebook(cells, NB_PATH)
    execute_notebook(NB_PATH)
    print("Done")
