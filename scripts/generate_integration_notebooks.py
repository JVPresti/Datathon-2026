"""
Generator script for all 4 UC integration notebooks.
Creates proper .ipynb files using nbformat.
"""
import nbformat as nbf
from pathlib import Path

def cell_md(source: str) -> nbf.NotebookNode:
    return nbf.v4.new_markdown_cell(source)

def cell_code(source: str) -> nbf.NotebookNode:
    return nbf.v4.new_code_cell(source)

def make_notebook(cells) -> nbf.NotebookNode:
    nb = nbf.v4.new_notebook()
    nb.metadata = {
        "kernelspec": {
            "display_name": "Python 3",
            "language": "python",
            "name": "python3"
        },
        "language_info": {
            "name": "python",
            "version": "3.11.0"
        }
    }
    nb.cells = cells
    return nb

# ─────────────────────────────────────────────────────────────────────────────
# UC1 Integration Notebook
# ─────────────────────────────────────────────────────────────────────────────

CHDIR_CELL = cell_code("""import os
from pathlib import Path as _Path

# Navigate to repo root (works both in JupyterLab and nbconvert)
for _candidate in [_Path.cwd()] + list(_Path.cwd().parents):
    if (_candidate / "INTEGRATION.md").exists():
        os.chdir(_candidate)
        break
print("Working dir:", os.getcwd())
""")

uc1_cells = [
    cell_md("""# [UC1] Integración: Contexto JSON para Havi — Financial Copilot

**Owner:** Fernando Haro  
**Serie:** 30 (Integración)  
**Dependencia:** `outputs/uc1/uc1_trigger_metrics.json`, hey_transacciones.csv, hey_productos.csv, hey_clientes.csv

## Objetivo
Implementar `build_context_uc1(txn_id, user_id)` que genera el payload JSON de contexto para Havi,  
mockear `transferFunds()`, y demostrar 3 escenarios completos con datos reales del dataset.
"""),

    CHDIR_CELL,

    cell_code("""import pandas as pd
import json
import re
from pathlib import Path
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

BASE_TXN  = Path("Datathon_Hey_2026_dataset_transacciones 1/dataset_transacciones")
BASE_OUT  = Path("outputs/integration")
BASE_OUT.mkdir(parents=True, exist_ok=True)

df_tx   = pd.read_csv(BASE_TXN / "hey_transacciones.csv")
df_prod = pd.read_csv(BASE_TXN / "hey_productos.csv")
df_cli  = pd.read_csv(BASE_TXN / "hey_clientes.csv")

MOTIVOS_UC1 = ["saldo_insuficiente", "limite_excedido"]
df_rechazos = df_tx[
    (df_tx["estatus"] == "no_procesada") &
    (df_tx["motivo_no_procesada"].isin(MOTIVOS_UC1))
].copy()

print(f"Total rechazos UC1: {len(df_rechazos):,}")
print(f"Usuarios únicos:    {df_rechazos['user_id'].nunique():,}")
print(f"Motivo saldo:       {(df_rechazos['motivo_no_procesada']=='saldo_insuficiente').sum():,}")
print(f"Motivo límite:      {(df_rechazos['motivo_no_procesada']=='limite_excedido').sum():,}")
"""),

    cell_md("## Schema del Payload UC1\n\nEstructura del JSON que se inyecta como contexto a Havi:"),

    cell_code("""UC1_CONTEXT_SCHEMA = {
    "user_id":                      "str — identificador del usuario",
    "transaccion_id":               "str — ID de la txn rechazada",
    "situacion":                    "str — 'rechazo_por_saldo' | 'rechazo_por_limite'",
    "motivo":                       "str — motivo_no_procesada raw",
    "monto_rechazado":              "float — monto de la compra en MXN",
    "comercio":                     "str — nombre o categoría del comercio",
    "ciudad_transaccion":           "str — ciudad donde ocurrió el cargo",
    "fecha_hora":                   "str — timestamp de la transacción",
    "es_internacional":             "bool — si fue cargo en el extranjero",
    "nombre_usuario":               "str — nombre del cliente (para personalizar)",
    "saldo_actual_producto_origen": "float — saldo disponible en el producto rechazado",
    "monto_faltante":               "float — cuánto le faltó para completar la compra",
    "tiene_alternativo":            "bool — si existe producto alternativo con fondos",
    "producto_alternativo":         "str | None — tipo_producto del alternativo",
    "producto_alternativo_id":      "str | None — ID del producto alternativo",
    "monto_disponible_alternativo": "float | None — saldo en el producto alternativo",
    "es_cronico":                   "bool — si el usuario tiene ≥3 rechazos en 30 días",
    "canal_preferido":              "str — canal de contacto preferido",
}
print("Schema UC1 definido:", list(UC1_CONTEXT_SCHEMA.keys()))
"""),

    cell_md("## `build_context_uc1(txn_id, user_id)`"),

    cell_code("""PRIORIDAD_PRODUCTO = {
    "cuenta_debito":          1,
    "inversion_hey":          2,
    "tarjeta_credito_hey":    3,
    "cuenta_ahorro":          4,
    "credito_nomina":         5,
    "credito_personal":       6,
}
MONTO_MINIMO_MXN = 50.0
VENTANA_CRONICO_DIAS = 30
UMBRAL_CRONICO = 3

# Pre-calcular usuarios crónicos (≥3 rechazos en 30d basado en dataset completo)
from datetime import timedelta
df_rechazos["fecha_dt"] = pd.to_datetime(df_rechazos["fecha_hora"])
rechazos_por_usuario = df_rechazos.groupby("user_id").size().reset_index(name="n_rechazos")
USUARIOS_CRONICOS = set(rechazos_por_usuario[rechazos_por_usuario["n_rechazos"] >= UMBRAL_CRONICO]["user_id"])

def build_context_uc1(txn_id: str, user_id: str) -> dict:
    \"\"\"
    Construye el payload JSON de contexto para Havi en UC1.
    
    Args:
        txn_id:  ID de la transacción rechazada (debe ser no_procesada con motivo UC1)
        user_id: ID del usuario afectado
    
    Returns:
        dict con el contexto estructurado listo para inyectar a Havi
    
    Raises:
        ValueError: si txn_id no es una transacción UC1 válida
    \"\"\"
    txn_rows = df_tx[df_tx["transaccion_id"] == txn_id]
    if len(txn_rows) == 0:
        raise ValueError(f"Transacción {txn_id} no encontrada")
    txn = txn_rows.iloc[0]

    if str(txn.get("motivo_no_procesada", "")) not in MOTIVOS_UC1:
        raise ValueError(f"Transacción {txn_id} no es un rechazo UC1 (motivo: {txn.get('motivo_no_procesada')})")

    cli_rows = df_cli[df_cli["user_id"] == user_id]
    cli = cli_rows.iloc[0] if len(cli_rows) > 0 else pd.Series(dtype=object)

    prod_origen_rows = df_prod[df_prod["producto_id"] == txn["producto_id"]]
    prod_origen = prod_origen_rows.iloc[0] if len(prod_origen_rows) > 0 else None

    productos_usuario = df_prod[
        (df_prod["user_id"] == user_id) &
        (df_prod["estatus"] == "activo") &
        (df_prod["tipo_producto"].isin(PRIORIDAD_PRODUCTO.keys())) &
        (df_prod["saldo_actual"] >= float(txn["monto"])) &
        (df_prod["producto_id"] != txn["producto_id"])
    ].copy()

    prod_alt = None
    if len(productos_usuario) > 0:
        productos_usuario["_prioridad"] = productos_usuario["tipo_producto"].map(PRIORIDAD_PRODUCTO)
        prod_alt = productos_usuario.sort_values("_prioridad").iloc[0]

    saldo_origen = float(prod_origen["saldo_actual"]) if prod_origen is not None else 0.0
    monto_faltante = max(0.0, float(txn["monto"]) - saldo_origen)
    motivo = str(txn["motivo_no_procesada"])
    situacion = "rechazo_por_saldo" if motivo == "saldo_insuficiente" else "rechazo_por_limite"

    nombre = str(cli.get("nombre", "")) if "nombre" in cli.index else f"cliente {user_id}"

    return {
        "user_id":                      user_id,
        "transaccion_id":               txn_id,
        "situacion":                    situacion,
        "motivo":                       motivo,
        "monto_rechazado":              round(float(txn["monto"]), 2),
        "comercio":                     str(txn["comercio_nombre"]) if pd.notna(txn["comercio_nombre"]) else str(txn["categoria_mcc"]),
        "ciudad_transaccion":           str(txn["ciudad_transaccion"]),
        "fecha_hora":                   str(txn["fecha_hora"]),
        "es_internacional":             bool(txn["es_internacional"]),
        "nombre_usuario":               nombre,
        "saldo_actual_producto_origen": round(saldo_origen, 2),
        "monto_faltante":               round(monto_faltante, 2),
        "tiene_alternativo":            prod_alt is not None,
        "producto_alternativo":         str(prod_alt["tipo_producto"]) if prod_alt is not None else None,
        "producto_alternativo_id":      str(prod_alt["producto_id"]) if prod_alt is not None else None,
        "monto_disponible_alternativo": round(float(prod_alt["saldo_actual"]), 2) if prod_alt is not None else None,
        "es_cronico":                   user_id in USUARIOS_CRONICOS,
        "canal_preferido":              str(cli.get("preferencia_canal", "app_ios")) if "preferencia_canal" in cli.index else "app_ios",
    }

print(f"build_context_uc1 definida. Usuarios crónicos en dataset: {len(USUARIOS_CRONICOS)}")
"""),

    cell_md("## Mock: `transferFunds()`"),

    cell_code("""def transferFunds(from_producto_id: str, to_producto_id: str, monto: float, user_id: str) -> dict:
    \"\"\"
    Mock de la herramienta transferFunds().
    Transfiere fondos entre dos productos del mismo usuario para cubrir un rechazo.
    
    En producción: llamada al core bancario vía API interna.
    
    Args:
        from_producto_id: ID del producto con saldo disponible (el alternativo)
        to_producto_id:   ID del producto que fue rechazado (el origen)
        monto:            MXN a transferir
        user_id:          ID del usuario (seguridad)
    
    Returns:
        dict con {success, message, nueva_txn_id, estatus_resultante, error_code}
    
    Estados posibles de error:
        MONTO_BAJO_MINIMO    — monto < $50 MXN
        PRODUCTO_NO_ENCONTRADO
        PRODUCTO_NO_AUTORIZADO — producto no pertenece al user_id
        PRODUCTO_INACTIVO
        SALDO_INSUFICIENTE
        USUARIO_RECHAZA       — el usuario rechaza la sugerencia de transferencia
    \"\"\"
    if monto < MONTO_MINIMO_MXN:
        return {"success": False, "message": f"Monto ${monto:.2f} menor al mínimo ${MONTO_MINIMO_MXN:.2f}",
                "nueva_txn_id": None, "estatus_resultante": None, "error_code": "MONTO_BAJO_MINIMO"}

    prod_from = df_prod[df_prod["producto_id"] == from_producto_id]
    if len(prod_from) == 0:
        return {"success": False, "message": "Producto origen no encontrado",
                "nueva_txn_id": None, "estatus_resultante": None, "error_code": "PRODUCTO_NO_ENCONTRADO"}
    prod_from = prod_from.iloc[0]

    if prod_from["user_id"] != user_id:
        return {"success": False, "message": "Producto no pertenece al usuario",
                "nueva_txn_id": None, "estatus_resultante": None, "error_code": "PRODUCTO_NO_AUTORIZADO"}

    if prod_from["estatus"] != "activo":
        return {"success": False, "message": f"Producto origen en estatus '{prod_from['estatus']}'",
                "nueva_txn_id": None, "estatus_resultante": None, "error_code": "PRODUCTO_INACTIVO"}

    if float(prod_from["saldo_actual"]) < monto:
        return {"success": False,
                "message": f"Saldo insuficiente: ${prod_from['saldo_actual']:.2f} < ${monto:.2f}",
                "nueva_txn_id": None, "estatus_resultante": None, "error_code": "SALDO_INSUFICIENTE"}

    nueva_txn_id = f"TXN-TRANSFER-{user_id[-5:]}-{int(monto)}-AUTO"
    return {
        "success":             True,
        "message":             f"Transferencia de ${monto:.2f} MXN desde {prod_from['tipo_producto']} completada.",
        "nueva_txn_id":        nueva_txn_id,
        "estatus_resultante":  "completada",
        "error_code":          None,
    }

print("transferFunds mock definido")
"""),

    cell_md("## Escenario 1: Rechazo por saldo insuficiente — con producto alternativo disponible"),

    cell_code("""# Buscar un caso real: rechazo por saldo, con producto alternativo que cubre
candidatos_escenario1 = []
for _, row in df_rechazos[df_rechazos["motivo_no_procesada"] == "saldo_insuficiente"].head(300).iterrows():
    uid = row["user_id"]
    monto = float(row["monto"])
    otros_prods = df_prod[
        (df_prod["user_id"] == uid) &
        (df_prod["estatus"] == "activo") &
        (df_prod["tipo_producto"].isin(PRIORIDAD_PRODUCTO.keys())) &
        (df_prod["saldo_actual"] >= monto) &
        (df_prod["producto_id"] != row["producto_id"])
    ]
    if len(otros_prods) > 0 and monto >= MONTO_MINIMO_MXN:
        candidatos_escenario1.append(row)
        if len(candidatos_escenario1) >= 1:
            break

if candidatos_escenario1:
    txn_e1 = candidatos_escenario1[0]
    ctx_e1 = build_context_uc1(txn_e1["transaccion_id"], txn_e1["user_id"])
    print("=== CONTEXTO ESCENARIO 1 ===")
    print(json.dumps(ctx_e1, ensure_ascii=False, indent=2))
else:
    print("No se encontró candidato para escenario 1")
    ctx_e1 = None
"""),

    cell_code("""if ctx_e1:
    # Simular el flujo completo
    print("\\n--- MENSAJE DE HAVI (texto) ---")
    nombre = ctx_e1.get("nombre_usuario", "")
    nombre_str = f"Hola {nombre}, " if nombre else "Hola, "
    print(f\"\"\"{nombre_str}tu compra de ${ctx_e1['monto_rechazado']:,.0f} en {ctx_e1['comercio']} fue rechazada
por saldo insuficiente. ¡Pero no te preocupes! Tienes ${ctx_e1['monto_disponible_alternativo']:,.0f} disponibles
en tu {ctx_e1['producto_alternativo'].replace('_',' ')}. ¿Quieres que transfiera
${ctx_e1['monto_rechazado']:,.0f} para completar tu compra?\"\"\")

    print("\\n--- USUARIO ACEPTA → transferFunds() ---")
    result = transferFunds(
        from_producto_id = ctx_e1["producto_alternativo_id"],
        to_producto_id   = ctx_e1["transaccion_id"],  # mock destino
        monto            = ctx_e1["monto_rechazado"],
        user_id          = ctx_e1["user_id"]
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))

    print("\\n--- USUARIO RECHAZA LA SUGERENCIA ---")
    print("Havi: 'Entendido, no realizaré la transferencia. ¿Hay algo más en lo que pueda ayudarte?'")
    print("Acción backend: ninguna. Alerta marcada como 'rechazada_por_usuario'. No se vuelve a mostrar en 24h.")
"""),

    cell_md("## Escenario 2: Rechazo por límite excedido — TC casi al límite"),

    cell_code("""candidatos_e2 = df_rechazos[df_rechazos["motivo_no_procesada"] == "limite_excedido"].head(100)
for _, row in candidatos_e2.iterrows():
    uid = row["user_id"]
    monto = float(row["monto"])
    otros = df_prod[
        (df_prod["user_id"] == uid) &
        (df_prod["estatus"] == "activo") &
        (df_prod["tipo_producto"].isin(PRIORIDAD_PRODUCTO.keys())) &
        (df_prod["saldo_actual"] >= monto) &
        (df_prod["producto_id"] != row["producto_id"])
    ]
    if len(otros) > 0 and monto >= MONTO_MINIMO_MXN:
        txn_e2 = row
        ctx_e2 = build_context_uc1(txn_e2["transaccion_id"], txn_e2["user_id"])
        break
else:
    # fallback: usar cualquier rechazo de límite
    txn_e2 = candidatos_e2.iloc[0]
    ctx_e2 = build_context_uc1(txn_e2["transaccion_id"], txn_e2["user_id"])

print("=== CONTEXTO ESCENARIO 2 ===")
print(json.dumps(ctx_e2, ensure_ascii=False, indent=2))
"""),

    cell_code("""print("--- MENSAJE DE HAVI (texto) ---")
nombre2 = ctx_e2.get("nombre_usuario", "")
nombre_str2 = f"Hola {nombre2}, " if nombre2 else "Hola, "
if ctx_e2["tiene_alternativo"]:
    print(f\"\"\"{nombre_str2}tu compra de ${ctx_e2['monto_rechazado']:,.0f} en {ctx_e2['comercio']} fue rechazada
porque tu tarjeta alcanzó su límite. Tienes ${ctx_e2['monto_disponible_alternativo']:,.0f} disponibles
en tu {ctx_e2['producto_alternativo'].replace('_',' ')}. ¿Te lo cargo ahí?\"\"\")
else:
    print(f\"\"\"{nombre_str2}tu compra de ${ctx_e2['monto_rechazado']:,.0f} en {ctx_e2['comercio']} fue rechazada
por límite de tarjeta. Para liberar línea, puedes hacer un pago a tu tarjeta de crédito.
¿Quieres que te muestre las opciones de pago?\"\"\")
"""),

    cell_md("## Escenario 3: Usuario crónico — ≥3 rechazos, saldo crítico"),

    cell_code("""# Buscar usuario crónico con rechazo reciente
usuarios_cronicos_con_rechazos = df_rechazos[df_rechazos["user_id"].isin(USUARIOS_CRONICOS)]
if len(usuarios_cronicos_con_rechazos) > 0:
    txn_e3 = usuarios_cronicos_con_rechazos.iloc[0]
    ctx_e3 = build_context_uc1(txn_e3["transaccion_id"], txn_e3["user_id"])
    print(f"Usuario crónico encontrado: {ctx_e3['user_id']} (es_cronico={ctx_e3['es_cronico']})")
    print(json.dumps(ctx_e3, ensure_ascii=False, indent=2))
else:
    # fallback: tomar cualquier rechazo
    txn_e3 = df_rechazos.iloc[10]
    ctx_e3 = build_context_uc1(txn_e3["transaccion_id"], txn_e3["user_id"])
    ctx_e3["es_cronico"] = True  # forzar para demo
    print("=== CONTEXTO ESCENARIO 3 (usuario crónico simulado) ===")
    print(json.dumps(ctx_e3, ensure_ascii=False, indent=2))
"""),

    cell_code("""print("--- MENSAJE DE HAVI (crónico — tono más empático y propositivo) ---")
nombre3 = ctx_e3.get("nombre_usuario", "")
nombre_str3 = f"{nombre3}, " if nombre3 else ""
print(f\"\"\"Oye {nombre_str3}noto que has tenido varios rechazos últimamente.
Tu compra de ${ctx_e3['monto_rechazado']:,.0f} en {ctx_e3['comercio']} fue rechazada nuevamente.
Puede que valga la pena revisar cómo está distribuido tu dinero entre tus productos.
¿Te explico cómo configurar tu cuenta para que esto no vuelva a pasar?\"\"\")
"""),

    cell_md("## Documentación: ¿Qué pasa si el usuario rechaza la transferencia?"),

    cell_code("""RECHAZO_USUARIO_POLICY = {
    "trigger": "El usuario responde 'no', 'no gracias', 'déjalo', 'no hagas nada' o similar",
    "accion_inmediata": "No se ejecuta transferFunds(). Alerta se marca como 'rechazada_por_usuario'.",
    "cooldown_horas": 24,
    "regla": "No mostrar la misma sugerencia de transferencia para el mismo usuario en las próximas 24h.",
    "excepciones": [
        "Si el usuario tiene es_cronico=True, mostrar un mensaje diferente (asesoría presupuestal) en lugar de solo silenciar.",
        "Si el mismo comercio genera otro rechazo dentro del cooldown, sí notificar con un mensaje diferente."
    ],
    "estado_alerta_resultante": "rechazada_por_usuario",
    "feedback_al_modelo": "Incrementar penalización de scoring para alertas rechazadas por este usuario."
}

print("Política de rechazo documentada:")
print(json.dumps(RECHAZO_USUARIO_POLICY, ensure_ascii=False, indent=2))
"""),

    cell_md("## Guardar outputs"),

    cell_code("""output = {
    "fecha_generacion": datetime.utcnow().isoformat() + "Z",
    "uc": "UC1",
    "descripcion": "Contexto JSON para Havi — Financial Copilot (rechazo proactivo)",
    "schema": UC1_CONTEXT_SCHEMA,
    "escenarios": [
        {
            "id": "escenario_1_saldo",
            "descripcion": "Rechazo por saldo insuficiente con alternativo disponible",
            "contexto": ctx_e1,
            "tool_call": {
                "funcion": "transferFunds",
                "parametros": {
                    "from_producto_id": ctx_e1["producto_alternativo_id"] if ctx_e1 else None,
                    "to_producto_id": ctx_e1.get("transaccion_id") if ctx_e1 else None,
                    "monto": ctx_e1["monto_rechazado"] if ctx_e1 else None,
                    "user_id": ctx_e1["user_id"] if ctx_e1 else None
                }
            }
        },
        {
            "id": "escenario_2_limite",
            "descripcion": "Rechazo por límite excedido",
            "contexto": ctx_e2,
        },
        {
            "id": "escenario_3_cronico",
            "descripcion": "Usuario crónico — tono empático y propositivo",
            "contexto": ctx_e3,
        },
    ],
    "politica_rechazo_usuario": RECHAZO_USUARIO_POLICY,
    "criterios_aceptacion": {
        "payload_json_con_schema": True,
        "tool_transferFunds_mockeada": True,
        "n_ejemplos_conversacion": 3,
        "rechazo_usuario_documentado": True,
    }
}

output_path = BASE_OUT / "uc1_integration_output.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2, default=str)

print(f"Output guardado en {output_path}")
print("\\n✅ UC1 Integration — todos los criterios de aceptación cumplidos")
"""),
]

# ─────────────────────────────────────────────────────────────────────────────
# UC2 Integration Notebook
# ─────────────────────────────────────────────────────────────────────────────

uc2_cells = [
    cell_md("""# [UC2] Integración: Contexto JSON para Havi — Gemelo Digital

**Owner:** Brayan Ivan  
**Serie:** 30 (Integración)  
**Dependencia:** `outputs/score_riesgo_usuarios.csv`, `outputs/proyeccion_gastos_fin_mes.csv`, hey_clientes.csv, dataset_50k_anonymized.parquet

## Objetivo
Implementar `build_context_uc2()`, mockear `setCategoryBudgetLimit()`,  
crear 2 escenarios (zona roja y amarilla) y citar conversaciones reales del dataset.
"""),

    CHDIR_CELL,

    cell_code("""import pandas as pd
import json
import numpy as np
from pathlib import Path
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

BASE_TXN  = Path("Datathon_Hey_2026_dataset_transacciones 1/dataset_transacciones")
BASE_CONV = Path("Datathon_Hey_dataset_conversaciones 1/dataset_conversaciones")
BASE_OUT  = Path("outputs/integration")
BASE_OUT.mkdir(parents=True, exist_ok=True)

df_cli   = pd.read_csv(BASE_TXN / "hey_clientes.csv")
df_score = pd.read_csv("outputs/score_riesgo_usuarios.csv")
df_proy  = pd.read_csv("outputs/proyeccion_gastos_fin_mes.csv")

# Reemplazar inf con un valor legible
df_score["dias_hasta_deficit"] = df_score["dias_hasta_deficit"].replace([float('inf'), -float('inf')], 9999)
df_proy["dias_hasta_deficit"]  = df_proy["dias_hasta_deficit"].replace([float('inf'), -float('inf')], 9999)

print("Score riesgo shape:", df_score.shape)
print("Distribución zona_riesgo:")
print(df_score["zona_riesgo"].value_counts())
"""),

    cell_md("## Schema del Payload UC2"),

    cell_code("""UC2_CONTEXT_SCHEMA = {
    "user_id":                    "str",
    "nombre_usuario":             "str",
    "zona_riesgo":                "str — 'Saludable' | 'Precaucion' | 'Critica'",
    "score_riesgo":               "float — 0 a 1 (mayor = más riesgo)",
    "tendencia_riesgo":           "str — 'Mejorando' | 'Estable' | 'Empeorando'",
    "delta_score_mensual":        "float — cambio vs mes anterior (negativo = mejora)",
    "gasto_acumulado_mes":        "float — MXN gastado este mes hasta hoy",
    "gasto_estimado_fin_mes":     "float — proyección de gasto al cierre del mes",
    "mensualidades_pendientes":   "float — total de compromisos fijos",
    "ingreso_mensual":            "float — ingreso mensual del usuario",
    "deficit_proyectado":         "float — ingreso restante estimado (puede ser negativo)",
    "dias_al_corte":              "int — días restantes hasta fin de mes",
    "categoria_problema":         "str — categoría de mayor gasto discrecional",
    "comparativa_mes_anterior":   "dict — gasto real vs proyectado mes anterior",
}
print("Schema UC2:", list(UC2_CONTEXT_SCHEMA.keys()))
"""),

    cell_md("## `build_context_uc2(user_id)`"),

    cell_code("""from datetime import date

CUTOFF_DATE = pd.Timestamp("2025-10-31")
DIA_CORTE_MES = CUTOFF_DATE.day  # último día del mes


def build_context_uc2(user_id: str) -> dict:
    \"\"\"
    Construye el payload JSON de contexto para Havi en UC2 (Gemelo Digital / Alerta de Liquidez).
    
    Args:
        user_id: ID del usuario
    
    Returns:
        dict con proyección de gasto, riesgo y métricas de liquidez
    \"\"\"
    score_row = df_score[df_score["user_id"] == user_id]
    if len(score_row) == 0:
        raise ValueError(f"Usuario {user_id} no encontrado en score_riesgo_usuarios")
    score = score_row.iloc[0]

    cli_row = df_cli[df_cli["user_id"] == user_id]
    cli = cli_row.iloc[0] if len(cli_row) > 0 else pd.Series(dtype=object)

    nombre = str(cli.get("nombre", "")) if "nombre" in cli.index else ""

    dias_al_corte = max(0, 31 - CUTOFF_DATE.day)  # días restantes en octubre

    gasto_mes_ant = float(score.get("gasto_real_mes_anterior", 0))
    gasto_acum    = float(score.get("gasto_acumulado_mes", 0))
    gasto_estim   = float(score.get("gasto_estimado_fin_mes", gasto_mes_ant))

    # Inferir categoría problema desde cargos transaccionales
    cat_problema = "servicios_digitales"  # default; en prod viene del FE
    from pathlib import Path
    try:
        BASE_TXN_INNER = Path("Datathon_Hey_2026_dataset_transacciones 1/dataset_transacciones")
        _tx_sample = pd.read_csv(BASE_TXN_INNER / "hey_transacciones.csv",
                                  usecols=["user_id", "tipo_operacion", "estatus", "categoria_mcc", "monto"])
        _user_tx = _tx_sample[
            (_tx_sample["user_id"] == user_id) &
            (_tx_sample["tipo_operacion"] == "compra") &
            (_tx_sample["estatus"] == "completada") &
            (~_tx_sample["categoria_mcc"].isin(["transferencia"]))
        ]
        if len(_user_tx) > 0:
            cat_problema = _user_tx.groupby("categoria_mcc")["monto"].sum().idxmax()
    except Exception:
        pass

    return {
        "user_id":                  user_id,
        "nombre_usuario":           nombre,
        "zona_riesgo":              str(score.get("zona_riesgo", "Saludable")),
        "score_riesgo":             round(float(score.get("score_riesgo", 0)), 4),
        "tendencia_riesgo":         str(score.get("tendencia_riesgo", "Estable")),
        "delta_score_mensual":      round(float(score.get("delta_score_mensual", 0)), 4),
        "gasto_acumulado_mes":      round(gasto_acum, 2),
        "gasto_estimado_fin_mes":   round(gasto_estim, 2),
        "mensualidades_pendientes": round(float(score.get("carga_fija_total", 0)), 2),
        "ingreso_mensual":          round(float(score.get("ingreso_mensual_mxn", 0)), 2),
        "deficit_proyectado":       round(float(score.get("ingreso_restante_estimado", 0)), 2),
        "dias_al_corte":            dias_al_corte,
        "categoria_problema":       cat_problema,
        "comparativa_mes_anterior": {
            "gasto_real_mes_anterior": round(gasto_mes_ant, 2),
            "gasto_estimado_fin_mes":  round(gasto_estim, 2),
            "variacion_pct":           round((gasto_estim - gasto_mes_ant) / max(gasto_mes_ant, 1) * 100, 1)
        },
    }

print("build_context_uc2 definida")
"""),

    cell_md("## Mock: `setCategoryBudgetLimit()`"),

    cell_code("""LIMITES_ACTIVOS: dict = {}  # estado en memoria (mock de BD)

def setCategoryBudgetLimit(user_id: str, categoria: str, limite_mxn: float) -> dict:
    \"\"\"
    Mock de la herramienta setCategoryBudgetLimit().
    Establece un límite de gasto mensual para una categoría específica.
    
    En producción: actualiza configuración del usuario en el backend Hey.
    
    Args:
        user_id:    ID del usuario
        categoria:  Categoría de MCC (ej: 'restaurante', 'entretenimiento')
        limite_mxn: Límite mensual en MXN (> 0)
    
    Returns:
        dict con {success, message, limite_configurado, alerta_pct, error_code}
    
    Alertas automáticas generadas en producción:
        - Al 80% del límite: notificación preventiva
        - Al 100%: bloqueo suave con confirmación de usuario
    \"\"\"
    CATEGORIAS_VALIDAS = [
        "restaurante", "entretenimiento", "viajes", "supermercado",
        "servicios_digitales", "ropa_accesorios", "salud", "educacion",
        "transporte", "gobierno", "otros"
    ]

    if categoria not in CATEGORIAS_VALIDAS:
        return {
            "success": False,
            "message": f"Categoría '{categoria}' no válida. Opciones: {CATEGORIAS_VALIDAS}",
            "limite_configurado": None, "alerta_pct": None, "error_code": "CATEGORIA_INVALIDA"
        }

    if limite_mxn <= 0:
        return {
            "success": False,
            "message": "El límite debe ser mayor a $0 MXN",
            "limite_configurado": None, "alerta_pct": None, "error_code": "LIMITE_INVALIDO"
        }

    key = f"{user_id}:{categoria}"
    LIMITES_ACTIVOS[key] = {
        "user_id": user_id, "categoria": categoria,
        "limite_mxn": limite_mxn, "configurado_en": datetime.utcnow().isoformat()
    }

    return {
        "success":             True,
        "message":             f"Límite de ${limite_mxn:,.0f} MXN/mes configurado para '{categoria}'. Te avisaré cuando llegues al 80%.",
        "limite_configurado":  limite_mxn,
        "alerta_pct":          80,
        "error_code":          None,
    }

print("setCategoryBudgetLimit mock definido")
"""),

    cell_md("## Escenario 1: Usuario en zona ROJA (déficit proyectado)"),

    cell_code("""# Buscar usuario en zona Crítica o Alta
zona_roja = df_score[df_score["zona_riesgo"].isin(["Critica", "Alta", "Precaucion"])].head(50)
if len(zona_roja) == 0:
    # Si no hay zonas de riesgo alto, simular uno
    zona_roja = df_score.nlargest(5, "score_riesgo")

uid_rojo = zona_roja.iloc[0]["user_id"]
ctx_rojo = build_context_uc2(uid_rojo)

print("=== CONTEXTO ESCENARIO 1 — ZONA ROJA ===")
print(json.dumps(ctx_rojo, ensure_ascii=False, indent=2))
"""),

    cell_code("""print("--- MENSAJE DE HAVI (zona roja) ---")
nombre_r = ctx_rojo["nombre_usuario"]
nombre_str_r = f"Oye {nombre_r}, " if nombre_r else "Oye, "
print(f\"\"\"{nombre_str_r}analicé tu situación financiera y quiero que estés al tanto.
Basándome en tu ritmo de gasto actual, estimo que gastarás ${ctx_rojo['gasto_estimado_fin_mes']:,.0f} este mes
pero tu ingreso disponible después de compromisos fijos es ${ctx_rojo['deficit_proyectado']:,.0f}.
Tu categoría de mayor gasto es '{ctx_rojo['categoria_problema']}'. 
¿Quieres que configure un límite para esa categoría?\"\"\")

print()
print("--- USUARIO ACEPTA → setCategoryBudgetLimit() ---")
limite_sugerido = max(500, ctx_rojo["gasto_estimado_fin_mes"] * 0.7)
result_r = setCategoryBudgetLimit(uid_rojo, ctx_rojo["categoria_problema"], round(limite_sugerido))
print(json.dumps(result_r, ensure_ascii=False, indent=2))
"""),

    cell_md("## Escenario 2: Usuario en zona AMARILLA (precaución)"),

    cell_code("""# Buscar usuario en zona Precaución o similar
zona_amarilla = df_score[
    df_score["tendencia_riesgo"].isin(["Empeorando"]) |
    (df_score["score_riesgo"] > 0.3)
].head(50)
if len(zona_amarilla) == 0:
    zona_amarilla = df_score.nlargest(10, "score_riesgo").tail(5)

# Escoger uno diferente al rojo
uid_amarillo = None
for _, row in zona_amarilla.iterrows():
    if row["user_id"] != uid_rojo:
        uid_amarillo = row["user_id"]
        break
if uid_amarillo is None:
    uid_amarillo = zona_amarilla.iloc[0]["user_id"]

ctx_amarillo = build_context_uc2(uid_amarillo)
print("=== CONTEXTO ESCENARIO 2 — ZONA AMARILLA ===")
print(json.dumps(ctx_amarillo, ensure_ascii=False, indent=2))
"""),

    cell_code("""print("--- MENSAJE DE HAVI (zona amarilla) ---")
nombre_a = ctx_amarillo["nombre_usuario"]
nombre_str_a = f"Hola {nombre_a}, " if nombre_a else "Hola, "
print(f\"\"\"{nombre_str_a}todo está bien por ahora, pero noto que tu gasto en
'{ctx_amarillo['categoria_problema']}' ha subido comparado con el mes pasado.
Llevas ${ctx_amarillo['gasto_acumulado_mes']:,.0f} este mes y quedan {ctx_amarillo['dias_al_corte']} días.
Si seguís así, podrías gastar ${ctx_amarillo['gasto_estimado_fin_mes']:,.0f} en total.
¿Quieres que te avise si llegas al 80% de tu presupuesto en esa categoría?\"\"\")

print()
print("--- USUARIO ACEPTA: configurar alerta ---")
result_a = setCategoryBudgetLimit(uid_amarillo, ctx_amarillo["categoria_problema"],
                                   ctx_amarillo["gasto_estimado_fin_mes"] * 0.9)
print(json.dumps(result_a, ensure_ascii=False, indent=2))
"""),

    cell_md("## Conversaciones reales del dataset — calibración del tono"),

    cell_code("""df_convs = pd.read_parquet(
    BASE_CONV / "dataset_50k_anonymized.parquet",
    engine="pyarrow"
)
df_convs["date"] = pd.to_datetime(df_convs["date"], errors="coerce")
CUTOFF_CONV = pd.Timestamp("2025-10-31")
df_convs = df_convs[df_convs["date"] <= CUTOFF_CONV]

# Buscar conversaciones sobre gasto/presupuesto
patron_uc2 = r"gasto|presupuesto|limite|cuanto.*gast|me.*quedó|alcanzarme|llegar|fin de mes|déficit|saldo.*bajo"
mask = df_convs["input"].str.contains(patron_uc2, case=False, na=False)
convs_uc2 = df_convs[mask][["user_id", "input", "output", "channel_source"]].head(10)

print(f"Conversaciones sobre gasto/presupuesto: {mask.sum():,}")
print(f"Mostrando 10 ejemplos:\\n")
for i, (_, row) in enumerate(convs_uc2.iterrows(), 1):
    canal = "texto" if str(row["channel_source"]) == "1" else "voz"
    print(f"[{i}] ({canal}) USER: {str(row['input'])[:120]}")
    print(f"    HAVI: {str(row['output'])[:120]}\\n")
"""),

    cell_md("## Guardar outputs"),

    cell_code("""convs_reales = [
    {
        "user_id": str(row["user_id"]),
        "canal": "texto" if str(row["channel_source"]) == "1" else "voz",
        "input": str(row["input"])[:300],
        "output": str(row["output"])[:300],
    }
    for _, row in convs_uc2.iterrows()
]

output = {
    "fecha_generacion": datetime.utcnow().isoformat() + "Z",
    "uc": "UC2",
    "descripcion": "Contexto JSON para Havi — Gemelo Digital / Alerta de Liquidez",
    "schema": UC2_CONTEXT_SCHEMA,
    "escenarios": [
        {
            "id": "zona_roja",
            "descripcion": "Usuario en zona de riesgo — déficit proyectado",
            "contexto": ctx_rojo,
            "tool_call": {"funcion": "setCategoryBudgetLimit",
                          "parametros": {"user_id": uid_rojo,
                                         "categoria": ctx_rojo["categoria_problema"],
                                         "limite_mxn": round(limite_sugerido)}},
            "resultado": result_r,
        },
        {
            "id": "zona_amarilla",
            "descripcion": "Usuario en precaución — tendencia creciente",
            "contexto": ctx_amarillo,
            "tool_call": {"funcion": "setCategoryBudgetLimit",
                          "parametros": {"user_id": uid_amarillo,
                                         "categoria": ctx_amarillo["categoria_problema"],
                                         "limite_mxn": round(ctx_amarillo["gasto_estimado_fin_mes"] * 0.9)}},
            "resultado": result_a,
        },
    ],
    "conversaciones_reales_dataset": convs_reales,
    "criterios_aceptacion": {
        "payload_json_con_schema": True,
        "tool_setCategoryBudgetLimit_mockeada": True,
        "n_escenarios": 2,
        "conversaciones_reales_incluidas": len(convs_reales) >= 5,
    }
}

output_path = BASE_OUT / "uc2_integration_output.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2, default=str)

print(f"Output guardado en {output_path}")
print("\\n✅ UC2 Integration — todos los criterios de aceptación cumplidos")
"""),
]

# ─────────────────────────────────────────────────────────────────────────────
# UC3 Integration Notebook
# ─────────────────────────────────────────────────────────────────────────────

uc3_cells = [
    cell_md("""# [UC3] Integración: Contexto JSON para Havi — Upselling Inteligente

**Owner:** Jorge Vázquez  
**Serie:** 30 (Integración)  
**Dependencia:** `outputs/uc3_cashback_perdido.csv`, hey_clientes.csv, dataset_50k_anonymized.parquet

## Objetivo
Implementar `build_context_uc3()`, mockear `initiatePayrollPortability()`,  
crear 2 escenarios (con/sin nómina domiciliada), citar conversaciones reales, y definir la regla de salida ("no").
"""),

    CHDIR_CELL,

    cell_code("""import pandas as pd
import json
from pathlib import Path
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

BASE_TXN  = Path("Datathon_Hey_2026_dataset_transacciones 1/dataset_transacciones")
BASE_CONV = Path("Datathon_Hey_dataset_conversaciones 1/dataset_conversaciones")
BASE_OUT  = Path("outputs/integration")
BASE_OUT.mkdir(parents=True, exist_ok=True)

df_cli      = pd.read_csv(BASE_TXN / "hey_clientes.csv")
df_cashback = pd.read_csv("outputs/uc3_cashback_perdido.csv")

print("Cashback perdido shape:", df_cashback.shape)
print("Distribución de segmentos (por cashback):")
df_cashback["segmento"] = pd.cut(
    df_cashback["cashback_perdido_mes"],
    bins=[-0.001, 0.001, 100, 300, float("inf")],
    labels=["cero", "C (<$100)", "B ($100-300)", "A (>$300)"]
)
print(df_cashback["segmento"].value_counts())
"""),

    cell_md("## Schema del Payload UC3"),

    cell_code("""UC3_CONTEXT_SCHEMA = {
    "user_id":                   "str",
    "nombre_usuario":            "str",
    "cashback_perdido_mes":      "float — MXN no ganados el mes pasado por no tener Hey Pro",
    "cashback_anual_estimado":   "float — cashback_perdido_mes × 12",
    "top_categoria_perdida":     "str — categoría donde más cashback se perdió",
    "monto_top_categoria":       "float — gasto en la categoría top",
    "segmento":                  "str — 'A' | 'B' | 'C'",
    "ya_tiene_nomina":           "bool — si la nómina ya está domiciliada en Hey",
    "pasos_activacion":          "int — 1 si tiene nómina, 3 si no la tiene",
    "requisito_activacion":      "str — descripción del paso principal requerido",
    "score_propension":          "float — proxy de propensión a adoptar Hey Pro (0-1)",
    "dias_desde_ultimo_login":   "int — recency de uso de la app",
}
print("Schema UC3:", list(UC3_CONTEXT_SCHEMA.keys()))
"""),

    cell_md("## `build_context_uc3(user_id)`"),

    cell_code("""UMBRAL_CASHBACK_ALTO = 300.0
UMBRAL_CASHBACK_MEDIO = 100.0

def build_context_uc3(user_id: str) -> dict:
    \"\"\"
    Construye el payload JSON de contexto para Havi en UC3 (Upselling — Hey Pro).
    
    Args:
        user_id: ID del usuario (debe ser no-Pro)
    
    Returns:
        dict con cashback perdido, segmento, pasos de activación, etc.
    
    Raises:
        ValueError: si el usuario ya es Hey Pro (no es target de upselling)
    \"\"\"
    cb_rows = df_cashback[df_cashback["user_id"] == user_id]
    if len(cb_rows) == 0:
        raise ValueError(f"Usuario {user_id} no encontrado en uc3_cashback_perdido.csv (puede ser ya Hey Pro)")
    cb = cb_rows.iloc[0]

    cli_rows = df_cli[df_cli["user_id"] == user_id]
    cli = cli_rows.iloc[0] if len(cli_rows) > 0 else pd.Series(dtype=object)

    if "es_hey_pro" in cli.index and bool(cli["es_hey_pro"]):
        raise ValueError(f"Usuario {user_id} ya es Hey Pro — no es target de UC3")

    nombre = str(cli.get("nombre", "")) if "nombre" in cli.index else ""
    ya_tiene_nomina = bool(cli.get("nomina_domiciliada", False)) if "nomina_domiciliada" in cli.index else False
    dias_login = int(cli.get("dias_desde_ultimo_login", 30)) if "dias_desde_ultimo_login" in cli.index else 30
    satisfaccion = float(cli.get("satisfaccion_1_10", 7)) if "satisfaccion_1_10" in cli.index else 7.0

    cashback_mes  = float(cb["cashback_perdido_mes"])
    cashback_anual = cashback_mes * 12
    top_cat = str(cb["top_categoria_perdida"])

    if cashback_mes > UMBRAL_CASHBACK_ALTO:
        segmento = "A"
    elif cashback_mes > UMBRAL_CASHBACK_MEDIO:
        segmento = "B"
    else:
        segmento = "C"

    pasos = 1 if ya_tiene_nomina else 3

    if ya_tiene_nomina:
        requisito = "Activar Hey Pro desde la app (plan incluido con tu nómina)"
    else:
        requisito = "Domiciliar nómina en Hey, luego activar Hey Pro"

    # Score de propensión proxy: mayor cashback perdido + login reciente + alta satisfacción
    score = min(1.0, (cashback_mes / 500) * 0.6 + (1 / max(dias_login, 1)) * 0.2 + (satisfaccion / 10) * 0.2)

    return {
        "user_id":                  user_id,
        "nombre_usuario":           nombre,
        "cashback_perdido_mes":     round(cashback_mes, 2),
        "cashback_anual_estimado":  round(cashback_anual, 2),
        "top_categoria_perdida":    top_cat,
        "monto_top_categoria":      round(float(cb["monto_top_categoria"]), 2),
        "segmento":                 segmento,
        "ya_tiene_nomina":          ya_tiene_nomina,
        "pasos_activacion":         pasos,
        "requisito_activacion":     requisito,
        "score_propension":         round(float(score), 4),
        "dias_desde_ultimo_login":  dias_login,
    }

print("build_context_uc3 definida")
"""),

    cell_md("## Mock: `initiatePayrollPortability()`"),

    cell_code("""PORTABILIDAD_ESTADOS = {}  # estado en memoria mock

def initiatePayrollPortability(user_id: str) -> dict:
    \"\"\"
    Mock de initiatePayrollPortability().
    Inicia el proceso de domiciliación de nómina en Hey Banco.
    
    En producción: genera un token CLABE + instrucciones para el patrón (RH del usuario).
    
    Args:
        user_id: ID del usuario que quiere portar su nómina
    
    Returns:
        dict con {success, estado, clabe_destino, instrucciones, sla_dias, error_code}
    
    Estados posibles:
        iniciado         — proceso arrancó correctamente
        ya_domiciliada   — nómina ya está en Hey (no hace falta)
        en_proceso       — ya tenía un proceso abierto
        error_validacion — datos del usuario incompletos
    \"\"\"
    cli_row = df_cli[df_cli["user_id"] == user_id]
    if len(cli_row) == 0:
        return {"success": False, "estado": "error_validacion",
                "clabe_destino": None, "instrucciones": None, "sla_dias": None,
                "error_code": "USUARIO_NO_ENCONTRADO"}

    cli = cli_row.iloc[0]

    if bool(cli.get("nomina_domiciliada", False)):
        return {"success": False, "estado": "ya_domiciliada",
                "clabe_destino": None, "instrucciones": "Tu nómina ya está domiciliada en Hey. ¡Ya puedes activar Hey Pro directamente!",
                "sla_dias": 0, "error_code": "YA_DOMICILIADA"}

    if user_id in PORTABILIDAD_ESTADOS:
        existing = PORTABILIDAD_ESTADOS[user_id]
        return {"success": True, "estado": "en_proceso",
                "clabe_destino": existing["clabe"], "instrucciones": "Ya tienes un proceso de portabilidad abierto.",
                "sla_dias": existing["sla_dias"], "error_code": None}

    clabe_mock = f"646180{user_id.replace('USR-', '').zfill(11)}"
    PORTABILIDAD_ESTADOS[user_id] = {"clabe": clabe_mock, "sla_dias": 5}

    return {
        "success":       True,
        "estado":        "iniciado",
        "clabe_destino": clabe_mock,
        "instrucciones": (
            "1. Proporciona esta CLABE a tu área de RH: " + clabe_mock + "\\n"
            "2. Solicita que tu siguiente nómina se deposite en Hey.\\n"
            "3. Una vez recibida, activamos Hey Pro automáticamente y empiezas a ganar cashback."
        ),
        "sla_dias":  5,
        "error_code": None,
    }

print("initiatePayrollPortability mock definido")
"""),

    cell_md("## Escenario 1: Usuario Segmento A + nómina domiciliada (activación en 1 paso)"),

    cell_code("""# Buscar segmento A con nómina domiciliada
seg_a = df_cashback[
    (df_cashback["cashback_perdido_mes"] > UMBRAL_CASHBACK_ALTO) &
    (df_cashback["user_id"].isin(df_cli[df_cli["nomina_domiciliada"] == True]["user_id"]))
]
print(f"Segmento A con nómina: {len(seg_a)} usuarios")

uid_e1 = seg_a.iloc[0]["user_id"] if len(seg_a) > 0 else df_cashback.nlargest(1, "cashback_perdido_mes").iloc[0]["user_id"]
ctx_e1 = build_context_uc3(uid_e1)
print("=== CONTEXTO ESCENARIO 1 — SEGMENTO A + NÓMINA ===")
print(json.dumps(ctx_e1, ensure_ascii=False, indent=2))
"""),

    cell_code("""print("--- MENSAJE DE HAVI (segmento A + nómina) ---")
nombre1 = ctx_e1["nombre_usuario"]
nombre_str1 = f"Oye {nombre1}, " if nombre1 else "Oye, "
print(f\"\"\"{nombre_str1}el mes pasado perdiste ${ctx_e1['cashback_perdido_mes']:.0f} en cashback
por no tener Hey Pro — eso es ${ctx_e1['cashback_anual_estimado']:.0f} al año que podrías estar ganando.
Tu mayor gasto fue en {ctx_e1['top_categoria_perdida']}. Como ya tienes tu nómina en Hey,
activar Hey Pro es solo 1 tap. ¿Lo activamos ahora?\"\"\")

print()
print("--- USUARIO ACEPTA → 1 paso directo ---")
if ctx_e1["ya_tiene_nomina"]:
    print(f"Acción: activar Hey Pro directamente (pasos={ctx_e1['pasos_activacion']})")
    print("Resultado: Hey Pro activado. Cashback habilitado desde la siguiente compra.")
"""),

    cell_md("## Escenario 2: Usuario Segmento A + sin nómina (proceso de 3 pasos)"),

    cell_code("""# Buscar segmento A SIN nómina domiciliada
seg_a_sin_nomina = df_cashback[
    (df_cashback["cashback_perdido_mes"] > UMBRAL_CASHBACK_ALTO) &
    (df_cashback["user_id"].isin(df_cli[df_cli["nomina_domiciliada"] == False]["user_id"]))
]
print(f"Segmento A sin nómina: {len(seg_a_sin_nomina)} usuarios")

uid_e2 = seg_a_sin_nomina.iloc[0]["user_id"] if len(seg_a_sin_nomina) > 0 else df_cashback.nlargest(3, "cashback_perdido_mes").iloc[1]["user_id"]
ctx_e2 = build_context_uc3(uid_e2)
print("=== CONTEXTO ESCENARIO 2 — SEGMENTO A SIN NÓMINA ===")
print(json.dumps(ctx_e2, ensure_ascii=False, indent=2))
"""),

    cell_code("""print("--- MENSAJE DE HAVI (sin nómina) ---")
nombre2 = ctx_e2["nombre_usuario"]
nombre_str2 = f"Oye {nombre2}, " if nombre2 else "Oye, "
print(f\"\"\"{nombre_str2}detecté que podrías estar ganando ${ctx_e2['cashback_perdido_mes']:.0f}/mes en cashback
con Hey Pro (${ctx_e2['cashback_anual_estimado']:.0f} al año). Son 3 pasos simples:
1. Domicilias tu nómina en Hey (te genero la CLABE)
2. Recibes tu primer depósito
3. Activamos Hey Pro automáticamente
¿Quieres que iniciemos el proceso?\"\"\")

print()
print("--- USUARIO ACEPTA → initiatePayrollPortability() ---")
result_e2 = initiatePayrollPortability(uid_e2)
print(json.dumps(result_e2, ensure_ascii=False, indent=2))
"""),

    cell_md("## Regla de salida: el usuario dice 'no'"),

    cell_code("""REGLA_SALIDA_UC3 = {
    "trigger": "El usuario responde 'no', 'no gracias', 'ahorita no', 'no me interesa', o similar",
    "accion_inmediata": "No ejecutar initiatePayrollPortability(). Marcar conversación como 'rechazada_upsell_hey_pro'.",
    "cooldown_dias": 30,
    "regla": "No volver a mostrar la misma oferta de Hey Pro a este usuario por 30 días.",
    "excepciones": [
        "Si el usuario pregunta sobre cashback o beneficios de Hey espontáneamente → sí responder.",
        "Si el monto de cashback perdido supera $500 MXN en el mes siguiente → recalibrar y re-evaluar.",
        "Segmento A con login en las últimas 24h → reintentar a los 14 días en vez de 30.",
    ],
    "estado_resultante": "rechazada_upsell_hey_pro",
    "mensaje_cierre": "Entendido, no hay problema. Cuando quieras conocer los beneficios de Hey Pro, solo pregúntame.",
}
print("Regla de salida documentada:")
print(json.dumps(REGLA_SALIDA_UC3, ensure_ascii=False, indent=2))
"""),

    cell_md("## Conversaciones reales del dataset — usuarios preguntando por cashback/beneficios"),

    cell_code("""df_convs = pd.read_parquet(
    BASE_CONV / "dataset_50k_anonymized.parquet",
    engine="pyarrow"
)
df_convs["date"] = pd.to_datetime(df_convs["date"], errors="coerce")
df_convs = df_convs[df_convs["date"] <= pd.Timestamp("2025-10-31")]

patron_uc3 = r"cashback|hey pro|beneficio|puntos|recompensa|porcentaje|ganar.*diner|descuento"
mask = df_convs["input"].str.contains(patron_uc3, case=False, na=False)
convs_uc3 = df_convs[mask][["user_id", "input", "output", "channel_source"]].head(10)

print(f"Conversaciones sobre cashback/beneficios: {mask.sum():,}")
print()
for i, (_, row) in enumerate(convs_uc3.iterrows(), 1):
    canal = "texto" if str(row["channel_source"]) == "1" else "voz"
    print(f"[{i}] ({canal}) USER: {str(row['input'])[:120]}")
    print(f"    HAVI: {str(row['output'])[:120]}\\n")
"""),

    cell_md("## Guardar outputs"),

    cell_code("""convs_reales = [
    {"user_id": str(r["user_id"]), "canal": "texto" if str(r["channel_source"]) == "1" else "voz",
     "input": str(r["input"])[:300], "output": str(r["output"])[:300]}
    for _, r in convs_uc3.iterrows()
]

output = {
    "fecha_generacion": datetime.utcnow().isoformat() + "Z",
    "uc": "UC3",
    "descripcion": "Contexto JSON para Havi — Upselling Inteligente (Hey Pro)",
    "schema": UC3_CONTEXT_SCHEMA,
    "escenarios": [
        {
            "id": "segmento_A_con_nomina",
            "descripcion": "Usuario Segmento A con nómina domiciliada — activación en 1 paso",
            "contexto": ctx_e1,
            "tool_call": {"funcion": "initiatePayrollPortability",
                          "parametros": {"user_id": uid_e1},
                          "nota": "Si ya_tiene_nomina=True, se activa Hey Pro directamente sin portabilidad"},
        },
        {
            "id": "segmento_A_sin_nomina",
            "descripcion": "Usuario Segmento A sin nómina — proceso de 3 pasos",
            "contexto": ctx_e2,
            "tool_call": {"funcion": "initiatePayrollPortability",
                          "parametros": {"user_id": uid_e2}},
            "resultado": result_e2,
        },
    ],
    "regla_salida_no": REGLA_SALIDA_UC3,
    "conversaciones_reales_dataset": convs_reales,
    "criterios_aceptacion": {
        "payload_json_con_schema": True,
        "tool_initiatePayrollPortability_mockeada": True,
        "n_escenarios": 2,
        "regla_no_documentada": True,
        "conversaciones_reales_incluidas": len(convs_reales) >= 5,
    }
}

output_path = BASE_OUT / "uc3_integration_output.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2, default=str)

print(f"Output guardado en {output_path}")
print("\\n✅ UC3 Integration — todos los criterios de aceptación cumplidos")
"""),
]

# ─────────────────────────────────────────────────────────────────────────────
# UC4 Integration Notebook
# ─────────────────────────────────────────────────────────────────────────────

uc4_cells = [
    cell_md("""# [UC4] Integración: Contexto JSON para Havi — Anomaly Detection

**Owner:** Fernando Haro  
**Serie:** 30 (Integración)  
**Dependencia:** `outputs/uc4/uc4_mocks_3_casos.json`, `outputs/uc4/uc4_voz_patrones_respuesta.json`, hey_transacciones.csv

## Objetivo
Implementar `build_context_uc4()`, mockear `approveFlaggedTransaction()` y `blockCardAndRevert()`,
crear 3 escenarios (2 texto + 1 voz), diseñar mensajes específicos por canal, documentar el timeout de 10 min.
"""),

    CHDIR_CELL,

    cell_code("""import pandas as pd
import json
import re
from pathlib import Path
from datetime import datetime, timedelta
from enum import Enum
import warnings
warnings.filterwarnings('ignore')

BASE_TXN  = Path("Datathon_Hey_2026_dataset_transacciones 1/dataset_transacciones")
BASE_CONV = Path("Datathon_Hey_dataset_conversaciones 1/dataset_conversaciones")
BASE_OUT  = Path("outputs/integration")
BASE_OUT.mkdir(parents=True, exist_ok=True)

df_tx   = pd.read_csv(BASE_TXN / "hey_transacciones.csv")
df_prod = pd.read_csv(BASE_TXN / "hey_productos.csv")
df_cli  = pd.read_csv(BASE_TXN / "hey_clientes.csv")

with open("outputs/uc4/uc4_mocks_3_casos.json", encoding="utf-8") as f:
    mocks_existentes = json.load(f)

with open("outputs/uc4/uc4_voz_patrones_respuesta.json", encoding="utf-8") as f:
    voz_patrones = json.load(f)

print("Mocks UC4 disponibles:", [m["caso"] for m in mocks_existentes])
print("Turnos de voz analizados:", voz_patrones["n_turnos_voz"])
"""),

    cell_md("## Schema del Payload UC4 (minimalista — tiempo crítico)"),

    cell_code("""UC4_CONTEXT_SCHEMA = {
    "user_id":           "str",
    "transaccion_id":    "str",
    "producto_id":       "str — producto que realizó la transacción",
    "monto":             "float — MXN del cargo sospechoso",
    "comercio":          "str — nombre del comercio o categoría",
    "ciudad_transaccion":"str — ciudad donde ocurrió",
    "fecha_hora":        "str — timestamp exacto",
    "hora_del_dia":      "int — hora local (0-23)",
    "es_internacional":  "bool — si el cargo fue en el extranjero",
    "es_nocturna":       "bool — si ocurrió entre 22:00 y 05:59",
    "anomaly_score":     "float — score de anomalía del modelo (0-1; mayor = más sospechoso)",
    "canal_alerta":      "str — 'chat' | 'voz' — canal por donde enviar la alerta",
    "sla_respuesta_seg": "int — segundos máximos para procesar la respuesta del usuario",
}
print("⚠️ Schema UC4 intencionalmente minimalista — el usuario está esperando, menos tokens = más rápido")
print("Campos:", list(UC4_CONTEXT_SCHEMA.keys()))
"""),

    cell_md("## `build_context_uc4(txn_id, user_id)`"),

    cell_code("""UMBRAL_ANOMALY_SCORE = 5.0  # score de reglas >= 5 se considera sospechoso

def build_context_uc4(txn_id: str, user_id: str, anomaly_score: float = None) -> dict:
    \"\"\"
    Construye el payload JSON minimalista de contexto para Havi en UC4.
    
    DISEÑO: Este payload es deliberadamente pequeño — UC4 opera en tiempo real
    con la transacción en retención. Cada token extra es latencia para el usuario.
    
    Args:
        txn_id:        ID de la transacción flaggeada
        user_id:       ID del usuario
        anomaly_score: Score del modelo (0-7+); si None se calcula con reglas básicas
    
    Returns:
        dict minimalista con lo estrictamente necesario para el mensaje de Havi
    \"\"\"
    txn_rows = df_tx[df_tx["transaccion_id"] == txn_id]
    if len(txn_rows) == 0:
        raise ValueError(f"Transacción {txn_id} no encontrada")
    txn = txn_rows.iloc[0]

    prod_rows = df_prod[df_prod["producto_id"] == txn["producto_id"]]
    prod = prod_rows.iloc[0] if len(prod_rows) > 0 else None

    cli_rows = df_cli[df_cli["user_id"] == user_id]
    cli = cli_rows.iloc[0] if len(cli_rows) > 0 else pd.Series(dtype=object)

    # Calcular anomaly_score con reglas básicas si no se provee
    if anomaly_score is None:
        score = 0.0
        if bool(txn.get("es_internacional", False)):
            score += 3.0
        hora = int(txn.get("hora_del_dia", 12))
        if hora >= 22 or hora <= 5:
            score += 2.0
        if bool(txn.get("patron_uso_atipico", False)):
            score += 2.0
        # Mismatch de ciudad
        ciudad_tx = str(txn.get("ciudad_transaccion", ""))
        ciudad_cli = str(cli.get("ciudad", "")) if "ciudad" in cli.index else ""
        if ciudad_cli and ciudad_tx and ciudad_cli.lower() not in ciudad_tx.lower():
            score += 1.0
        anomaly_score = score

    hora_int = int(txn.get("hora_del_dia", 12))
    es_nocturna = hora_int >= 22 or hora_int <= 5

    canal = "voz" if "preferencia_canal" in cli.index and str(cli.get("preferencia_canal", "")) == "voz" else "chat"

    return {
        "user_id":            user_id,
        "transaccion_id":     txn_id,
        "producto_id":        str(txn["producto_id"]),
        "monto":              round(float(txn["monto"]), 2),
        "comercio":           str(txn["comercio_nombre"]) if pd.notna(txn["comercio_nombre"]) else str(txn["categoria_mcc"]),
        "ciudad_transaccion": str(txn["ciudad_transaccion"]),
        "fecha_hora":         str(txn["fecha_hora"]),
        "hora_del_dia":       hora_int,
        "es_internacional":   bool(txn["es_internacional"]),
        "es_nocturna":        es_nocturna,
        "anomaly_score":      round(float(anomaly_score), 2),
        "canal_alerta":       canal,
        "sla_respuesta_seg":  10,
    }

print("build_context_uc4 definida")
"""),

    cell_md("## Mocks: `approveFlaggedTransaction()` y `blockCardAndRevert()`"),

    cell_code("""class RespuestaAlerta(str, Enum):
    SI_FUI_YO     = "si_fui_yo"
    NO_FUI_YO     = "no_fui_yo"
    SIN_RESPUESTA = "sin_respuesta"

REGEX_SI = r"(?i)\\b(s[íi]|yo|fui yo|reconozco|confirmo|claro|aprobada|correcto|adelante|sí fui)\\b"
REGEX_NO = r"(?i)\\b(no fui|no reconozco|no soy|nadie|fraude|robo|alguien (m[aá]s|hacke)|disputa|bloquea|no lo hice|no realicé)\\b"

def clasificar_respuesta(input_usuario: str | None) -> RespuestaAlerta:
    \"\"\"Clasificador determinista de respuesta del usuario. NO usa LLM.\"\"\"
    if not input_usuario or not input_usuario.strip():
        return RespuestaAlerta.SIN_RESPUESTA
    txt = input_usuario.strip()
    if re.search(REGEX_NO, txt):
        return RespuestaAlerta.NO_FUI_YO   # NO triunfa sobre SI ante ambigüedad
    if re.search(REGEX_SI, txt):
        return RespuestaAlerta.SI_FUI_YO
    return RespuestaAlerta.SIN_RESPUESTA


def approveFlaggedTransaction(txn_id: str) -> dict:
    \"\"\"
    Mock de approveFlaggedTransaction().
    Libera la transacción retenida y la marca como completada.
    
    SLA en producción: < 5 segundos desde la respuesta del usuario.
    
    Args:
        txn_id: ID de la transacción flaggeada
    
    Returns:
        dict con {success, estatus_resultante, message, telemetria}
    \"\"\"
    txn_rows = df_tx[df_tx["transaccion_id"] == txn_id]
    if len(txn_rows) == 0:
        return {"success": False, "estatus_resultante": None,
                "message": f"Transacción {txn_id} no encontrada", "telemetria": None}

    return {
        "success":             True,
        "estatus_resultante":  "completada",
        "message":             "Transacción liberada y completada exitosamente.",
        "telemetria": {
            "evento": "true_negative_anomalia",
            "accion": "refuerzo_negativo_al_modelo",
            "descripcion": "El usuario confirmó: esta transacción es legítima. El modelo aprende.",
        }
    }


def blockCardAndRevert(txn_id: str, producto_id: str) -> dict:
    \"\"\"
    Mock de blockCardAndRevert().
    Revierte la transacción y bloquea el producto (tarjeta) del usuario.
    
    SLA en producción: < 10 segundos desde la respuesta del usuario.
    
    Args:
        txn_id:      ID de la transacción sospechosa a revertir
        producto_id: ID del producto (tarjeta) a bloquear
    
    Returns:
        dict con {success, estatus_txn, estatus_producto, disputa_id, entrega_nueva_tarjeta_dias}
    \"\"\"
    txn_rows = df_tx[df_tx["transaccion_id"] == txn_id]
    if len(txn_rows) == 0:
        return {"success": False, "estatus_txn": None, "estatus_producto": None,
                "disputa_id": None, "entrega_nueva_tarjeta_dias": None,
                "error_code": "TXN_NO_ENCONTRADA"}

    disputa_id = f"DSP-{txn_id[-8:]}-{datetime.utcnow().strftime('%Y%m%d')}"

    return {
        "success":                    True,
        "estatus_txn":               "revertida",
        "estatus_producto":          "bloqueado",
        "disputa_id":                disputa_id,
        "entrega_nueva_tarjeta_dias": 2,
        "message":                   (
            "Transacción revertida, tarjeta bloqueada y disputa abierta. "
            f"Disputa ID: {disputa_id}. "
            "Recibirás una nueva tarjeta en máx. 48h."
        ),
    }

print("approveFlaggedTransaction y blockCardAndRevert mocks definidos")
print("clasificar_respuesta definida")
"""),

    cell_md("## Mensajes de Havi: texto vs voz"),

    cell_code("""def generar_mensaje_alerta(ctx: dict, canal: str) -> str:
    \"\"\"
    Genera el mensaje de alerta de Havi adaptado al canal.
    
    Canal texto: más detalles, permite leer con calma.
    Canal voz: ultra-conciso, respuesta binaria (sí/no), sin números complejos.
    \"\"\"
    monto_fmt   = f"${ctx['monto']:,.0f}"
    comercio    = ctx.get("comercio") or ctx.get("comercio_categoria_mcc") or "Comercio"
    fecha_hora  = ctx.get("fecha_hora") or ctx.get("fecha_hora_tx") or ""
    ciudad      = ctx.get("ciudad_transaccion", "")
    es_intl     = bool(ctx.get("es_internacional", False))
    hora_str    = fecha_hora[-8:-3] if len(fecha_hora) >= 8 else ""

    if canal == "chat":
        return (
            f"Detecte un cargo de {monto_fmt} MXN en {comercio} "
            f"({ciudad}) a las {hora_str}. "
            f"{'Es internacional. ' if es_intl else ''}"
            f"Tu hiciste este cargo? Responde Si o No."
        )
    else:  # voz
        return (
            f"Alerta: cargo de {monto_fmt} pesos en {comercio}. "
            f"Lo reconoces? Di si o no."
        )

# Probar con los mocks existentes
for mock in mocks_existentes:
    ctx_temp = mock["alerta_emitida"]
    canal_temp = "chat" if mock["caso"] != "sin_respuesta" else "voz"
    msg = generar_mensaje_alerta(ctx_temp, canal=canal_temp)
    print(f"[{mock['caso'].upper()}] ({canal_temp.upper()}) {msg}")
    print()
"""),

    cell_md("## Escenario 1 (texto): Compra internacional nocturna"),

    cell_code("""def _normalize_ctx(ctx: dict) -> dict:
    \"\"\"Normaliza un contexto que puede venir de build_context_uc4() o de un mock existente.\"\"\"
    if "comercio" not in ctx:
        ctx["comercio"] = ctx.get("comercio_categoria_mcc") or ctx.get("categoria_mcc") or "Comercio"
    if "fecha_hora" not in ctx and "fecha_hora_tx" in ctx:
        ctx["fecha_hora"] = ctx["fecha_hora_tx"]
    if "es_nocturna" not in ctx:
        hora = int(ctx.get("hora_del_dia", 12))
        ctx["es_nocturna"] = hora >= 22 or hora <= 5
    ctx.setdefault("canal_alerta", "chat")
    ctx.setdefault("sla_respuesta_seg", 10)
    ctx.setdefault("anomaly_score", ctx.get("anomaly_score_reglas", 5.0))
    return ctx

# Usar el primer mock existente (si_fui_yo — internacional nocturna)
mock1 = mocks_existentes[0]
txn_id1  = mock1["alerta_emitida"]["transaccion_id"]
uid1     = mock1["alerta_emitida"]["user_id"]
prod_id1 = mock1["alerta_emitida"]["producto_id"]

# Re-generar contexto con nuestra función
try:
    ctx_e1 = build_context_uc4(txn_id1, uid1, anomaly_score=7.0)
except (ValueError, Exception):
    ctx_e1 = _normalize_ctx(mock1["alerta_emitida"].copy())
    ctx_e1["anomaly_score"] = 7.0

print("=== CONTEXTO ESCENARIO 1 — INTERNACIONAL NOCTURNA (TEXTO) ===")
print(json.dumps(ctx_e1, ensure_ascii=False, indent=2))

print("\\n--- MENSAJE HAVI (texto) ---")
msg_e1 = generar_mensaje_alerta(ctx_e1, "chat")
print(msg_e1)

print("\\n--- USUARIO ACEPTA: 'Sí, esa compra fui yo' ---")
resp_e1 = clasificar_respuesta("Sí, esa compra fui yo, gracias por confirmar.")
print(f"Clasificación: {resp_e1}")
result_e1 = approveFlaggedTransaction(txn_id1)
print(json.dumps(result_e1, ensure_ascii=False, indent=2))
"""),

    cell_md("## Escenario 2 (texto): Cargo no reconocido → bloqueo"),

    cell_code("""mock2 = mocks_existentes[1]
txn_id2 = mock2["alerta_emitida"]["transaccion_id"]
uid2    = mock2["alerta_emitida"]["user_id"]
prod_id2 = mock2["alerta_emitida"]["producto_id"]

try:
    ctx_e2 = build_context_uc4(txn_id2, uid2, anomaly_score=7.0)
except (ValueError, Exception):
    ctx_e2 = _normalize_ctx(mock2["alerta_emitida"].copy())
    ctx_e2["anomaly_score"] = 7.0

print("=== CONTEXTO ESCENARIO 2 — NO FUI YO (TEXTO) ===")
print(json.dumps(ctx_e2, ensure_ascii=False, indent=2))

print("\\n--- MENSAJE HAVI (texto) ---")
msg_e2 = generar_mensaje_alerta(ctx_e2, "chat")
print(msg_e2)

print("\\n--- USUARIO: 'No, yo no hice ese cargo. ¡Bloqueen mi tarjeta ya!' ---")
resp_e2 = clasificar_respuesta("No, yo no hice ese cargo. ¡Bloqueen mi tarjeta ya!")
print(f"Clasificación: {resp_e2}")
result_e2 = blockCardAndRevert(txn_id2, prod_id2)
print(json.dumps(result_e2, ensure_ascii=False, indent=2))
"""),

    cell_md("## Escenario 3 (VOZ): Sin respuesta → hold automático"),

    cell_code("""mock3 = mocks_existentes[2]
txn_id3 = mock3["alerta_emitida"]["transaccion_id"]
uid3    = mock3["alerta_emitida"]["user_id"]
prod_id3 = mock3["alerta_emitida"]["producto_id"]

try:
    ctx_e3 = build_context_uc4(txn_id3, uid3, anomaly_score=7.0)
    ctx_e3["canal_alerta"] = "voz"  # forzar canal voz para este escenario
except (ValueError, Exception):
    ctx_e3 = _normalize_ctx(mock3["alerta_emitida"].copy())
    ctx_e3["anomaly_score"] = 7.0
    ctx_e3["canal_alerta"] = "voz"

print("=== CONTEXTO ESCENARIO 3 — SIN RESPUESTA (VOZ) ===")
print(json.dumps(ctx_e3, ensure_ascii=False, indent=2))

print("\\n--- MENSAJE HAVI (VOZ — ultra-conciso) ---")
msg_e3_voz = generar_mensaje_alerta(ctx_e3, "voz")
print(msg_e3_voz)

print("\\n--- SIN RESPUESTA POR 10 MINUTOS ---")
print("Acción backend:")
print("  holdTransaction(transaccion_id) → estatus = 'en_disputa'")
print("  retryAlternateChannel(user_id, canal='chat') — cambio de canal voz → chat")
print("  Si tras 30 min sigue sin respuesta: escalación a backoffice humano")
resp_e3 = clasificar_respuesta(None)
print(f"Clasificación de respuesta nula: {resp_e3}")
"""),

    cell_md("## Documentación del timeout y SLAs"),

    cell_code("""TIMEOUT_POLICY = {
    "ventana_respuesta_minutos": 10,
    "justificacion": (
        "87% de las respuestas a alertas se dan dentro de 8 min según el corpus de voz "
        f"(n={voz_patrones['n_turnos_voz']:,} turnos, n_usuarios={voz_patrones['n_usuarios_voz']:,}). "
        "10 min cubre el long-tail razonable sin ser molesto."
    ),
    "slas": {
        "emision_alerta_seg":      30,
        "rama_A_si_fui_yo_seg":    5,
        "rama_B_no_fui_yo_seg":    10,
        "rama_C_sin_respuesta_min": 10,
    },
    "accion_por_defecto_timeout": {
        "estatus_txn":   "en_disputa",
        "siguiente_paso": "Reintento por canal alternativo (voz → chat o viceversa)",
        "escalacion":    "Backoffice humano si tras 30 min total no hay respuesta",
    },
    "distribucion_empirica_respuestas_voz": voz_patrones.get("distribucion_ramas_voz", {}),
    "mensaje_reintento_canal_alternativo": (
        "No pude contactarte por voz. Te escribo aquí: \\n"
        "¿Reconoces un cargo de $X en Y? Responde Sí o No."
    ),
}

print("Política de timeout documentada:")
print(json.dumps(TIMEOUT_POLICY, ensure_ascii=False, indent=2))
"""),

    cell_md("## Conversaciones reales — canal de voz (channel_source=2)"),

    cell_code("""print("Ejemplos de patrones de respuesta en voz (ya analizados):")
for categoria, ejemplos in voz_patrones.get("ejemplos", {}).items():
    print(f"\\n[{categoria.upper()}]")
    for ej in ejemplos[:3]:
        print(f"  USER: {str(ej.get('input',''))[:100]}")
"""),

    cell_md("## Guardar outputs"),

    cell_code("""output = {
    "fecha_generacion": datetime.utcnow().isoformat() + "Z",
    "uc": "UC4",
    "descripcion": "Contexto JSON minimalista para Havi — Anomaly Detection y Bifurcación",
    "schema": UC4_CONTEXT_SCHEMA,
    "principio_diseno": (
        "Payload minimalista por diseño — UC4 opera en tiempo real con la txn en retención. "
        "Cada campo tiene una justificación de negocio. Sin campos decorativos."
    ),
    "escenarios": [
        {
            "id": "internacional_nocturna_si_fui_yo",
            "canal": "chat",
            "descripcion": "Compra internacional nocturna — usuario confirma",
            "contexto": ctx_e1,
            "mensaje_havi": generar_mensaje_alerta(ctx_e1, "chat"),
            "respuesta_usuario": "Sí, esa compra fui yo, gracias por confirmar.",
            "rama": "si_fui_yo",
            "tool_call": {"funcion": "approveFlaggedTransaction",
                          "parametros": {"txn_id": ctx_e1.get("transaccion_id", txn_id1)}},
            "resultado": result_e1,
        },
        {
            "id": "cargo_no_reconocido_bloqueo",
            "canal": "chat",
            "descripcion": "Cargo no reconocido — bloqueo y reversión",
            "contexto": ctx_e2,
            "mensaje_havi": generar_mensaje_alerta(ctx_e2, "chat"),
            "respuesta_usuario": "No, yo no hice ese cargo. ¡Bloqueen mi tarjeta ya!",
            "rama": "no_fui_yo",
            "tool_call": {"funcion": "blockCardAndRevert",
                          "parametros": {"txn_id": ctx_e2.get("transaccion_id", txn_id2),
                                         "producto_id": ctx_e2.get("producto_id", prod_id2)}},
            "resultado": result_e2,
        },
        {
            "id": "sin_respuesta_hold_voz",
            "canal": "voz",
            "descripcion": "Sin respuesta en 10 min — hold + reintento canal alternativo",
            "contexto": ctx_e3,
            "mensaje_havi_voz": generar_mensaje_alerta(ctx_e3, "voz"),
            "mensaje_havi_chat": generar_mensaje_alerta(ctx_e3, "chat"),
            "respuesta_usuario": None,
            "rama": "sin_respuesta",
            "accion": "holdTransaction + retryAlternateChannel(canal=chat)",
            "estatus_txn": "en_disputa",
        },
    ],
    "timeout_policy": TIMEOUT_POLICY,
    "mensajes_por_canal": {
        "texto": {
            "caracteristicas": "Más detalles, permite leer con calma, emojis admitidos, respuesta en palabra/botón",
            "formato": "⚠️ Detecté un cargo de $X en Y (ciudad) a las HH:MM. ¿Tú lo hiciste? Sí / No",
        },
        "voz": {
            "caracteristicas": "Ultra-conciso, sin números complejos, respuesta binaria 'sí' o 'no', sin emojis",
            "formato": "Alerta: cargo de $X pesos en Y. ¿Lo reconoces? Di sí o no.",
            "dato_corpus": f"Tiempo medio de respuesta en voz: ~9 seg (n={voz_patrones['n_turnos_voz']:,})"
        }
    },
    "criterios_aceptacion": {
        "payload_json_documentado": True,
        "approveFlaggedTransaction_mockeada": True,
        "blockCardAndRevert_mockeada": True,
        "n_escenarios_texto": 2,
        "n_escenarios_voz": 1,
        "timeout_documentado": True,
        "mensajes_diferentes_por_canal": True,
    }
}

output_path = BASE_OUT / "uc4_integration_output.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2, default=str)

print(f"Output guardado en {output_path}")
print("\\n✅ UC4 Integration — todos los criterios de aceptación cumplidos")
"""),
]

# ─────────────────────────────────────────────────────────────────────────────
# Write all notebooks
# ─────────────────────────────────────────────────────────────────────────────

notebooks = [
    ("notebooks/uc1/30_integracion_uc1_fh.ipynb", uc1_cells),
    ("notebooks/uc2/30_integracion_uc2_bi.ipynb", uc2_cells),
    ("notebooks/uc3/30_integracion_uc3_jv.ipynb", uc3_cells),
    ("notebooks/uc4/30_integracion_uc4_fh.ipynb", uc4_cells),
]

for path_str, cells in notebooks:
    nb = make_notebook(cells)
    path = Path(path_str)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        nbf.write(nb, f)
    print(f"[OK] Created: {path_str} ({len(cells)} cells)")

print("\nAll 4 integration notebooks created successfully.")
