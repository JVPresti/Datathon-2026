[UC1] Contexto JSON para Havi: Financial Copilot

🎯 Objetivo

Diseñar el payload JSON exacto que se inyecta como contexto a Havi para el caso UC1, y mockear la herramienta transferFunds().

📋 Contexto

El LLM necesita recibir datos estructurados para generar una respuesta empática y precisa. El payload debe tener exactamente lo que Havi necesita para armar el mensaje — ni más (tokens innecesarios) ni menos (respuesta vaga).

📂 Datos relevantes

Output de todos los features UC1

hey_transacciones.csv: datos del rechazo (comercio, monto, ciudad)

hey_productos.csv: producto origen y producto alternativo

🔧 Tareas

[x] Diseñar schema del payload JSON de contexto para Havi

[x] Implementar función build_context_uc1(txn_id, user_id) que genera el payload

[x] Definir la firma de la tool: transferFunds(from_producto_id, to_producto_id, monto, user_id)

[x] Mockear 3 escenarios con datos reales del dataset

[x] Redactar 3 respuestas de ejemplo de Havi usando el payload

[x] Documentar límites: ¿qué pasa si el usuario rechaza la transferencia?

✅ Criterios de aceptación

Payload JSON documentado con schema y ejemplo real

Tool transferFunds() mockeada con validaciones básicas

3 ejemplos de conversación Havi completos (trigger → mensaje → respuesta usuario → acción)

🔗 Dependencias

[UC1] Regla de negocio: Trigger de notificación proactiva

💡 Notas técnicas

def build_context_uc1(txn, prod_origen, prod_alt, cliente):
    return {
        "situacion": "rechazo_por_saldo",
        "monto_rechazado": txn["monto"],
        "comercio": txn["comercio_nombre"],
        "saldo_actual_producto": prod_origen["saldo_actual"],
        "monto_faltante": txn["monto"] - prod_origen["saldo_actual"],
        "producto_alternativo": prod_alt["tipo_producto"],
        "monto_disponible": prod_alt["saldo_actual"],
        "nombre_usuario": cliente.get("nombre","")
    }

---

[UC2] Contexto JSON para Havi: Gemelo Digital

🎯 Objetivo

Diseñar el payload JSON de contexto para Havi en UC2 y mockear la herramienta setCategoryBudgetLimit().

📋 Contexto

El Gemelo Digital necesita comunicar una predicción financiera de forma empática. El payload debe darle a Havi los números exactos para que el mensaje sea concreto y no genérico.

📂 Datos relevantes

Output de todos los features UC2 (proyección, score de riesgo, compromisos fijos)

dataset_50k_anonymized.parquet: analizar conversaciones sobre presupuesto para inspirar el tono de Havi

🔧 Tareas

[x] Diseñar schema del payload JSON con: proyección de gasto, mensualidades, déficit estimado, días al corte

[x] Incluir comparativa vs mes anterior (para contexto de tendencia)

[x] Identificar la categoría de mayor riesgo para mencionar en el mensaje

[x] Definir tool: setCategoryBudgetLimit(user_id, categoria, limite_mxn)

[x] Analizar 10 conversaciones reales del dataset sobre "gasto", "presupuesto" para calibrar el tono

[x] Mockear 2 escenarios: usuario en zona roja (déficit proyectado) y zona amarilla

✅ Criterios de aceptación

Payload JSON documentado con ejemplo real

Tool setCategoryBudgetLimit() mockeada

2 conversaciones de ejemplo completas (predicción → alerta → límite configurado)

Ejemplos de conversación reales del dataset citados como referencia de tono

🔗 Dependencias

[UC2] Modelo predictivo: Alerta de liquidez

💡 Notas técnicas

def build_context_uc2(user_id, proyeccion, carga_fija, cliente):
    return {
        "gasto_acumulado_mes": proyeccion["gasto_acumulado"],
        "gasto_proyectado_fin_mes": proyeccion["gasto_estimado_fin_mes"],
        "mensualidades_pendientes": carga_fija["total_mensualidades"],
        "ingreso_mensual": cliente["ingreso_mensual_mxn"],
        "deficit_proyectado": proyeccion["ingreso_restante_estimado"],
        "dias_al_corte": proyeccion["dias_restantes_mes"],
        "categoria_problema": proyeccion["top_categoria_exceso"]
    }

---

[UC3] Contexto JSON para Havi: Upselling

🎯 Objetivo

Diseñar el payload JSON de contexto para Havi en UC3 y mockear la herramienta initiatePayrollPortability().

📋 Contexto

El mensaje de upselling debe sentirse como un consejo de un amigo financiero, no como publicidad. El payload le da a Havi el dato duro (los pesos perdidos) y el camino concreto de acción para presentar.

📂 Datos relevantes

Output de [UC3] Segmentación: Targets de upselling

Output de [UC3] Feature: Cashback potencial perdido

dataset_50k_anonymized.parquet: buscar conversaciones donde usuarios preguntan por beneficios

🔧 Tareas

[x] Diseñar schema del payload: cashback_perdido_mes, top_categorias_gasto, requisito_activacion, estimado_anual

[x] Calcular cashback_anual_estimado = cashback_perdido_mes * 12 (dato de impacto fuerte)

[x] Definir tool: initiatePayrollPortability(user_id) con flujo de activación

[x] Buscar en conversaciones: usuarios preguntando por "Hey Pro", "cashback", "beneficios" — citar ejemplos reales para calibrar tono de Havi

[x] Mockear 2 escenarios: usuario con nómina domiciliada (activación en 1 paso) y sin ella (proceso más largo)

[x] Definir la regla de salida: si el usuario dice "no" → no volver a mostrar en X días

✅ Criterios de aceptación

Payload JSON con ejemplo real (datos del dataset)

Tool initiatePayrollPortability() mockeada con estados posibles

2 conversaciones completas (segmento A con y sin nómina domiciliada)

Ejemplos de conversaciones reales del dataset incluidos

🔗 Dependencias

[UC3] Segmentación: Targets de upselling

💡 Notas técnicas

def build_context_uc3(user_id, cashback_data, cliente):
    return {
        "cashback_perdido_mes_anterior": cashback_data["cashback_perdido_mes"],
        "cashback_anual_estimado": cashback_data["cashback_perdido_mes"] * 12,
        "top_categoria": cashback_data["top_categoria_perdida"],
        "ya_tiene_nomina": cliente["nomina_domiciliada"],
        "pasos_activacion": 1 if cliente["nomina_domiciliada"] else 3
    }

---

[UC4] Contexto JSON para Havi: Anomaly Detection

🎯 Objetivo

Diseñar el payload JSON de contexto para Havi en UC4 y mockear las herramientas approveFlaggedTransaction() y blockCardAndRevert().

📋 Contexto

En UC4 el tiempo es crítico — la transacción está en retención y el usuario está esperando. El mensaje de Havi debe ser ultra-claro y permitir una respuesta en 1 click o 1 palabra. El payload debe tener el mínimo necesario para no confundir al usuario.

📂 Datos relevantes

Output de [UC4] Modelo de detección de anomalías

hey_transacciones.csv: datos de la transacción sospechosa

dataset_50k_anonymized.parquet: conversaciones de channel_source=2 (voz) — canal crítico para UC4

🔧 Tareas

[x] Diseñar payload minimalista: monto, comercio, ciudad, hora, es_internacional, anomaly_score

[x] Definir approveFlaggedTransaction(txn_id) → libera la transacción, cambia estatus a 'completada'

[x] Definir blockCardAndRevert(txn_id, producto_id) → revierte + bloquea producto

[x] Analizar conversaciones de channel_source=2 (voz): ¿cómo responden los usuarios por voz?

[x] Mockear 3 escenarios: compra internacional nocturna, compra en ciudad nueva, monto atípico

[x] Definir el mensaje de Havi para canal de voz vs canal de texto (deben ser diferentes)

[x] Documentar el timeout: 10 minutos sin respuesta → acción por defecto

✅ Criterios de aceptación

Payload JSON documentado

Ambas tools mockeadas con estados finales del producto y transacción

3 conversaciones de ejemplo (2 texto, 1 voz)

Timeout documentado con acción por defecto

🔗 Dependencias

[UC4] Lógica de bifurcación post-alerta

💡 Notas técnicas

# Analizar respuestas en canal de voz
voz_alertas = df_convs[
    (df_convs["channel_source"]=="2") & 
    (df_convs["input"].str.contains("cargo|compra|reconoc|bloquear", case=False, na=False))
]
print(f"Alertas por voz: {len(voz_alertas)}")
print(voz_alertas[["input","output"]].head(10))


---

esto no es necesario que lo hagas, pero ten en cuenta que todos estos uc se van a tener que integrar en una presentacion de demo de 5 minutos, donde se deberan mostrar cada flujo.

🎯 Objetivo

Preparar y ejecutar una demo end-to-end que muestre los 4 flujos de Havi con datos reales del dataset ante los jueces del datathon.

📋 Contexto

Este es el artefacto final de presentación. Los jueces deben ver Havi en acción con datos reales, no con ejemplos genéricos. Cada UC debe mostrar el ciclo completo: trigger → análisis → mensaje → acción.

📂 Datos relevantes

Todos los features y modelos de los 4 UCs

dataset_50k_anonymized.parquet: citar conversaciones reales de Havi para mostrar coherencia de tono

🔧 Tareas

[ ] Seleccionar 1 usuario real del dataset por cada UC (que ejemplifique bien el caso)

[ ] UC1 Demo: mostrar el rechazo → cálculo del saldo alternativo → mensaje de Havi → transferencia

[ ] UC2 Demo: mostrar proyección → score de riesgo → alerta de Havi → configuración de límite

[ ] UC3 Demo: mostrar cashback perdido → score propensión → mensaje de Havi → inicio de portabilidad

[ ] UC4 Demo: mostrar transacción atípica → score de anomalía → alerta de Havi → bifurcación Sí/No

[ ] Incluir métricas de impacto: ¿cuántos usuarios serían beneficiados por cada UC?

[ ] Preparar slide de arquitectura técnica del pipeline

✅ Criterios de aceptación

4 demos ejecutables sin errores en < 5 minutos total

Cada demo usa datos reales del dataset (no hardcodeados)

Las métricas de impacto están calculadas y documentadas

La demo es narrativa: "Aquí está Juan, gastó X, Havi le dijo Y, Juan hizo Z"

🔗 Dependencias

Todos los tickets de Integración completados

Dashboard de métricas de impacto

💡 Notas técnicas

Usar Jupyter con widgets (ipywidgets) o Streamlit para hacer la demo interactiva si el tiempo lo permite.

🎯 Objetivo

Calcular y visualizar el impacto potencial de los 4 casos de uso en números concretos para la presentación ante los jueces.

📋 Contexto

Los jueces quieren ver impacto de negocio, no solo modelos. Este dashboard traduce el trabajo técnico en métricas de valor: usuarios beneficiados, pesos ahorrados, fraudes prevenidos.

📂 Datos relevantes

Outputs de todos los features y modelos de los 4 UCs

Los 4 datasets para calcular universos de usuarios

🔧 Tareas

[ ] UC1: % de rechazos resolubles automáticamente + monto promedio recuperado por transacción

[ ] UC2: # de usuarios en zona de riesgo de liquidez este mes + % con déficit proyectado

[ ] UC3: MXN totales perdidos en cashback por usuarios sin Hey Pro + potencial de conversión del segmento A

[ ] UC4: # de transacciones atípicas por día + % reducción de falsos positivos vs método actual

[ ] Crear 4 visualizaciones de impacto (una por UC) — estilo ejecutivo, no técnico

[ ] Calcular el "impacto anual estimado" si se implementan los 4 UCs

[ ] Incluir métrica de conversaciones: ¿cuántas conversaciones del dataset corresponden a cada UC?

✅ Criterios de aceptación

4 KPIs claros (uno por UC) con número concreto

4 visualizaciones exportables como imagen

Impacto anual estimado calculado y documentado

Tiempo de carga del dashboard < 30 segundos

🔗 Dependencias

Todos los tickets de Modelado completados

Notebook unificado de EDA

💡 Notas técnicas

# KPIs clave
kpi_uc1 = rechazos_resolubles / total_rechazos * 100
kpi_uc2 = usuarios_zona_roja / total_usuarios * 100
kpi_uc3 = cashback_total_perdido_mes  # en MXN
kpi_uc4 = txn_atipicas_diarias_promedio