# Reporte de Feature Engineering — Proyecto Havi / datamoles

**Datathon DSC x Hey 2026**
**Fecha:** Abril 2026
**Equipo:** datamoles

---

## Índice

1. [¿Qué es Feature Engineering y por qué importa?](#1-qué-es-feature-engineering-y-por-qué-importa)
2. [Conexión con las fases anteriores y siguientes](#2-conexión-con-las-fases-anteriores-y-siguientes)
3. [Decisiones técnicas transversales](#3-decisiones-técnicas-transversales)
4. [UC1 — Variables de riesgo y alerta](#4-uc1--variables-de-riesgo-y-alerta)
5. [UC2 — El Gemelo Digital (~70 variables por usuario)](#5-uc2--el-gemelo-digital-70-variables-por-usuario)
6. [UC3 — Variables para upselling inteligente](#6-uc3--variables-para-upselling-inteligente)
7. [UC4 — Variables conversacionales](#7-uc4--variables-conversacionales)
8. [Archivos generados](#8-archivos-generados)
9. [¿Qué sigue? — La fase de Modelado](#9-qué-sigue--la-fase-de-modelado)

---

## 1. ¿Qué es Feature Engineering y por qué importa?

Imaginá que querés predecir si una persona va a pedir un préstamo en los próximos 30 días. Lo que tenés en el dataset crudo son miles de filas con montos, fechas y categorías de transacciones — datos muy granulares, muy ruidosos, muy "crudos". Un modelo de machine learning no puede aprender bien de eso directamente.

**Feature Engineering** (ingeniería de variables, o simplemente "construir features") es la fase donde transformamos esos datos crudos en información significativa que un modelo puede aprovechar. En lugar de darle al modelo "una fila por transacción", le damos "un resumen estructurado por usuario": cuántas veces gastó más de lo esperado en el último mes, si tiene rechazos recurrentes, si sus ingresos cubren sus gastos, si habló con Havi sobre inversiones.

Es, en esencia, **convertir datos en conocimiento accionable**.

### ¿Por qué no saltear esta fase?

Un modelo entrenado sobre datos crudos sin procesar va a aprender patrones superficiales o directamente ruido. Pero un modelo entrenado sobre features bien diseñadas va a aprender los patrones de comportamiento que realmente importan. La calidad del Feature Engineering tiene más impacto en el resultado final que la elección del algoritmo. Podés cambiar de Random Forest a XGBoost y ganar un 2% de performance. Podés agregar una variable bien pensada y ganar un 15%.

### El rol en Havi específicamente

Havi tiene que ser **proactivo**: tiene que anticiparse al usuario, no esperar que pregunte. Para eso, el modelo necesita entender quién es cada usuario — su comportamiento financiero, sus patrones, sus riesgos, sus necesidades latentes. Todo eso viene de esta fase.

---

## 2. Conexión con las fases anteriores y siguientes

```
EDA (Análisis Exploratorio)
         │
         │  "Entendimos los datos: distribuciones,
         │   valores nulos, outliers, rangos válidos"
         ▼
Feature Engineering  ← Estamos acá
         │
         │  "Transformamos entendimiento en variables
         │   que un modelo puede consumir"
         ▼
Modelado
         │
         │  "Entrenamos modelos que usan esas variables
         │   para hacer predicciones o detectar patrones"
         ▼
Integración & Demo
```

El EDA nos dijo **qué hay** en los datos. El Feature Engineering nos permite decirle al modelo **qué significa** lo que hay. El modelado va a usar esas variables para aprender patrones. La integración va a tomar las predicciones del modelo y convertirlas en alertas, recomendaciones y respuestas dentro de Havi.

Una variable mal diseñada en esta fase genera un modelo que aprende algo incorrecto. Un modelo que aprende algo incorrecto genera alertas falsas o recomendaciones irrelevantes. Por eso esta fase es tan crítica.

---

## 3. Decisiones técnicas transversales

Antes de entrar en cada caso de uso, hay decisiones que aplican a todos por igual. Acá van.

### Fecha de corte: 31 de octubre de 2025

Elegimos esta fecha como el límite del período de análisis. ¿Por qué? Porque es el último mes con **volumen de datos alto y consistente** en ambos datasets (transacciones y conversaciones). Los meses posteriores tienen datos parciales o muy escasos, y usarlos introduciría ruido en las variables calculadas.

Todo lo que calculamos (frecuencia de gastos, rechazos, comportamiento reciente) está referenciado a esta fecha. Es el "hoy" del modelo.

### Ventanas temporales: 30 y 90 días

Calculamos muchas variables en dos horizontes:

- **30 días**: captura el **comportamiento reciente**. Es útil para detectar cambios abruptos o señales de alerta inmediata.
- **90 días**: captura la **tendencia**. Es útil para entender el patrón habitual del usuario y diferenciarlo de fluctuaciones puntuales.

Por ejemplo, si un usuario tuvo 3 rechazos en los últimos 30 días pero solo 4 en los últimos 90, eso sugiere que el problema es nuevo y está empeorando. Si tuvo 3 de 10 rechazos en los últimos 30 días sobre un total de 30 en 90 días, el patrón es crónico.

### Prefijo `feat_` en todas las variables derivadas

Toda variable que **calculamos nosotros** (en contraposición a las que vienen directamente del dataset original) lleva el prefijo `feat_`. Esto hace que sea muy fácil distinguir qué es dato original y qué es variable derivada, tanto en el código como en los outputs.

Ejemplos: `feat_rechazos_30d`, `feat_gasto_promedio_90d`, `feat_shannon_entropy_mcc`.

### Un notebook por UC, con validaciones y persistencia

Cada caso de uso tiene su propio notebook de Feature Engineering, con:
- **Validaciones internas**: checks de que las variables tengan distribuciones sensatas (sin todos ceros, sin NaN masivos, sin outliers extremos sin tratar).
- **Persistencia de resultados**: cada notebook escribe su output en formato Parquet (columnar, comprimido, eficiente para leer en el siguiente paso).

---

## 4. UC1 — Variables de riesgo y alerta

### ¿Qué queremos lograr?

Havi tiene que poder decirle al usuario: "Ey, tus últimas 4 transacciones fueron rechazadas — ¿querés revisar tu saldo?" o "Detecté un gasto internacional inusual en tu cuenta". Para eso necesitamos variables que capturen **señales de alerta** a nivel usuario.

### Variables construidas

#### Rechazos

Construimos un perfil de rechazos por usuario:

- **¿Cuántos rechazos tuvo?** En los últimos 30 y 90 días.
- **¿En qué categorías?** Un usuario que tiene rechazos en supermercados tiene un problema distinto a uno que los tiene en retiros de cajero.
- **¿Con qué frecuencia?** El ratio de rechazos sobre el total de transacciones indica si es un problema puntual o sistémico.
- **¿Cuánto tiempo lleva con esto?** Si lleva más de 15 días con rechazos recurrentes, la urgencia de la alerta es mayor.
- **¿Cuánto dinero rechazado acumula?** El monto total rechazado es un proxy del impacto financiero real.

#### Comportamiento atípico

Construimos variables que detectan si el usuario está haciendo algo fuera de su patrón habitual:

- **Gastos nocturnos**: transacciones entre las 23:00 y las 6:00. Un patrón inusual podría ser señal de uso no autorizado.
- **Gastos internacionales**: transacciones en moneda extranjera o en comercios ubicados fuera de México.
- **Desplazamiento geográfico**: si el usuario tiene registrada una ciudad y sus transacciones están ocurriendo en otra ciudad consistentemente.

#### Liquidez

¿El usuario tiene plata para cubrir sus gastos? Calculamos:

- **Ratio ingresos/egresos**: si los ingresos (abonos) en los últimos 30 días no alcanzan para cubrir los egresos (cargos), el usuario está en territorio rojo.
- **Monto promedio de gastos rechazados vs. saldo promedio disponible**: si el monto de un rechazo es pequeño relativo a su saldo habitual, puede ser un error técnico. Si el monto rechazado es comparable a su gasto típico, es un problema de liquidez real.

#### Señales conversacionales cruzadas

Aprovechando los datos de UC4, agregamos variables que indican si el usuario **habló con Havi sobre estos problemas**:

- ¿Mencionó fraude o rechazo en alguna conversación?
- ¿Cuántos días hace que habló de eso?

Esto enriquece mucho el perfil de riesgo: un usuario que tuvo rechazos Y habló con Havi al respecto está en un estado de alerta diferente a uno que tuvo rechazos pero nunca contactó soporte.

### Outputs

| Archivo | Descripción |
|---|---|
| `feat_uc1_user_risk.parquet` | Un registro por usuario con su perfil de riesgo completo |
| `feat_uc1_alertas.parquet` | Transacciones accionables (rechazos y anomalías) listas para generar alertas |

---

## 5. UC2 — El Gemelo Digital (~70 variables por usuario)

### ¿Qué queremos lograr?

El "gemelo digital" es una representación numérica completa de cada usuario: quién es, cómo usa Hey Banco, cuánto y en qué gasta, qué patrones tiene. Esta representación va a alimentar un algoritmo de clustering que va a agrupar a los usuarios en "personas financieras" — tipos de usuario con comportamientos similares.

Pensalo como construir una **tarjeta de identidad financiera** para cada usuario, con ~70 dimensiones en lugar de foto, nombre y CURP.

### Variables construidas

#### Demografía

Las más básicas pero no por eso menos importantes:
- Edad
- Ciudad y estado de residencia
- Antigüedad como cliente de Hey Banco

#### Engagement con Hey Banco

¿Qué tan "involucrado" está el usuario con el banco?

- **¿Es Hey Pro?** Los usuarios Pro tienen acceso a beneficios adicionales (cashback, etc.) y su comportamiento es sistemáticamente diferente.
- **¿Tiene nómina domiciliada?** Un usuario que recibe su sueldo en Hey tiene una relación mucho más profunda con el banco.
- **¿Cuándo fue el último login?** Un usuario activo es muy diferente a uno que solo tiene la cuenta abierta pero no la usa.
- **Frecuencia de uso en los últimos 30/90 días**.

#### Portafolio de productos

¿Qué tiene contratado con Hey Banco?
- Qué tipos de productos tiene (cuenta, crédito, inversión, etc.)
- Cuántos productos tiene en total
- Saldo de inversiones
- Utilización del crédito (cuánto del límite está usando — una variable muy indicativa de situación financiera)

#### Comportamiento transaccional

El corazón del gemelo digital. Variables de recencia, frecuencia y monto:

- **Recencia**: ¿cuándo fue la última transacción? Un usuario que no movió dinero en 30 días es muy diferente a uno que tiene 5 transacciones por día.
- **Frecuencia**: transacciones por mes en los últimos 30 y 90 días.
- **Monto**: gasto promedio por transacción, gasto total mensual, variabilidad del gasto (¿es constante o muy errático?).

Este patrón (Recencia, Frecuencia, Monto) viene de la metodología **RFM**, ampliamente usada en análisis de clientes. La analogía es simple: un cliente que compró ayer, compra seguido y gasta bastante es muy distinto a uno que compró hace 6 meses, raramente y poco.

#### Diversidad de categorías de gasto (Entropía de Shannon)

Esta es una de las variables más interesantes. Usamos la **entropía de Shannon** para medir qué tan "diverso" es el gasto de un usuario entre categorías (MCC — Merchant Category Code: supermercado, restaurante, gasolina, entretenimiento, etc.).

La entropía es una medida de "desorden" o "diversidad". Entropía alta = el usuario gasta de manera distribuida entre muchas categorías. Entropía baja = concentra casi todo su gasto en una o dos categorías.

- Un usuario con entropía alta (gasta en supermercados, restaurantes, Netflix, gasolina, ropa) tiene un perfil de consumo diverso y activo.
- Un usuario con entropía baja que solo hace transferencias tiene un perfil muy diferente — probablemente usa Hey Banco casi exclusivamente como cuenta puente.

Importante: excluimos las transferencias de este cálculo, porque inflarían la entropía artificialmente sin reflejar diversidad real de consumo.

#### Patrones temporales

¿Cuándo gasta el usuario?

- **¿Gasta más los fines de semana?** El ratio fines de semana vs. días hábiles es un indicador de perfil de vida.
- **¿Gasta de noche?** El porcentaje de transacciones nocturnas distingue perfiles muy diferentes.
- **¿Qué día de la semana es más activo?** El día con mayor volumen transaccional.

#### Canales preferidos

¿Cómo opera el usuario con Hey Banco?

- iOS vs. Android vs. web
- POS (punto de venta, tarjeta física)
- CODI (cobros digitales QR)
- Cajero automático

Un usuario que opera principalmente desde POS físico tiene un perfil diferente a uno que hace todo desde la app. Un usuario de CODI frecuente en un municipio pequeño sugiere un perfil de pequeño comerciante.

#### Indicadores de riesgo

Heredados de UC1:
- Tasa de rechazos
- Si tuvo disputas o contracargos
- Si hizo reintentos de transacciones (señal de problemas de liquidez)

### Output

| Archivo | Descripción |
|---|---|
| `feat_uc2_personas.parquet` | Un registro por usuario con sus ~70 variables del gemelo digital |

---

## 6. UC3 — Variables para upselling inteligente

### ¿Qué queremos lograr?

En lugar de mostrarle a todos los usuarios la misma oferta de producto, Havi tiene que poder decir: "A este usuario específico, en este momento, con este comportamiento, le conviene y probablemente le interese el producto X". Eso requiere construir variables que capturen tanto la **elegibilidad** como la **propensión** a adoptar un producto.

### Estructura del problema

El dataset de candidatos tiene una fila por cada combinación **usuario × producto candidato**. Por ejemplo, si hay 5 productos posibles y 15,000 usuarios, hay potencialmente 75,000 filas — aunque muchas se filtran por elegibilidad.

### Variables construidas

#### ¿Ya tiene el producto?

La más obvia pero fundamental: si el usuario ya tiene el producto, no hay nada que ofrecerle. Este filtro elimina candidatos irrelevantes desde el inicio.

#### Elegibilidad por reglas de negocio

Hay reglas del banco que determinan si un usuario puede o no acceder a un producto:

- No ofrecerle crédito a alguien que ya tiene 3 créditos activos.
- No ofrecerle Hey Pro a alguien que ya es Pro.
- No ofrecerle una cuenta de inversiones a alguien con saldo promedio mensual menor a cierto umbral.

Estas reglas vienen del conocimiento del negocio, no de los datos. Las aplicamos como filtros duros antes de entrenar cualquier modelo.

#### Comportamiento transaccional reciente (90 días)

Las mismas variables RFM del UC2, pero calculadas para los últimos 90 días. La idea es capturar el comportamiento **reciente** del usuario, que es el más predictivo de su propensión a tomar una decisión financiera próxima.

#### Cashback "perdido" por no ser Hey Pro

Esta es una variable muy poderosa para el caso de upselling de Hey Pro. Calculamos cuánto cashback habría ganado el usuario en los últimos 90 días **si hubiera sido Hey Pro** durante ese período. Esa cantidad es el "costo de oportunidad" de no tenerlo.

Un usuario que habría ganado $800 pesos en cashback es un candidato muy diferente a uno que habría ganado $50. Havi puede decirle exactamente: "Si activás Hey Pro ahora, en los próximos 90 días podrías recuperar hasta $X en cashback basado en tu historial de gastos".

#### Menciones del producto en conversaciones

Cruzando con UC4: ¿el usuario mencionó alguna vez este producto en una conversación con Havi? ¿Preguntó por inversiones? ¿Consultó sobre créditos?

Un usuario que preguntó sobre inversiones pero todavía no tiene el producto es un candidato de alta propensión. Ya expresó interés — solo falta el empujón correcto.

#### Label proxy para entrenamiento supervisado

Como no tenemos un dataset etiquetado con "este usuario adoptó el producto / este no lo adoptó", creamos un **label proxy**: usamos adopciones históricas de productos (usuarios que contrataron algo después de un período de elegibilidad) para generar una variable objetivo aproximada.

Un *label proxy* es una variable que aproxima lo que queremos predecir usando información que sí está disponible. No es perfecta, pero es suficientemente informativa para entrenar un modelo inicial.

### Output

| Archivo | Descripción |
|---|---|
| `feat_uc3_candidates.parquet` | Una fila por combinación usuario×producto candidato, con todas las variables y el label proxy |

---

## 7. UC4 — Variables conversacionales

### ¿Qué queremos lograr?

Tenemos 49,999 conversaciones entre usuarios y Havi. Este es el dataset más diferencial de la competencia — la mayoría de los equipos no va a tener esto. El objetivo es extraer **inteligencia** de esas conversaciones: qué intenciones tiene el usuario, qué sentimiento expresa, y cómo eso se correlaciona con su comportamiento transaccional.

### Las dos dimensiones del análisis

El análisis conversacional opera en dos niveles:

1. **Nivel de turno**: cada mensaje individual dentro de una conversación.
2. **Nivel de conversación**: el resumen de una conversación completa.
3. **Nivel de usuario**: el perfil conversacional agregado de cada usuario.

Finalmente, todo se cruza con los datos transaccionales.

### Clasificación de intenciones (intent) — reglas de keywords

Para clasificar la intención de cada turno del usuario, usamos un sistema de **reglas basadas en palabras clave**. Por ejemplo:

- Si el mensaje contiene "saldo", "cuánto tengo", "cuánto hay" → intención: **consulta de saldo**
- Si contiene "rechazo", "no me dejó", "declinada" → intención: **reporte de problema**
- Si contiene "fraude", "robo", "no fui yo" → intención: **reporte de fraude**
- Si contiene "inversión", "rendimiento", "CETES" → intención: **consulta de producto de inversión**

Esto no es tan sofisticado como un modelo de NLP entrenado, pero tiene una ventaja clave: es **interpretable y ajustable**. Podemos ver exactamente por qué un mensaje fue clasificado como X, y podemos corregir las reglas fácilmente si algo está mal.

Las categorías de intención definidas incluyen: consulta de saldo, transferencia, reporte de problema, consulta de producto, queja, onboarding, y otras.

### Embeddings semánticos — MiniLM-L12-v2

Para capturar el **significado** de cada turno (más allá de las palabras clave), usamos un modelo de lenguaje pequeño y eficiente: **MiniLM-L12-v2**.

Un *embedding* es una representación vectorial del significado de un texto. En términos simples: el modelo convierte cada mensaje en un vector de números que captura su "esencia semántica". Mensajes similares en significado van a tener vectores similares, aunque usen palabras completamente diferentes.

Por ejemplo, "no me acepta la tarjeta" y "me rechazaron en la tienda" van a tener embeddings parecidos, aunque no compartan ninguna palabra. Eso es lo que los hace poderosos.

Usamos MiniLM específicamente porque:
- Es muy pequeño y rápido (a diferencia de modelos grandes como GPT)
- Tiene muy buen desempeño para tareas de clasificación semántica
- Puede correr sin GPU en tiempos razonables

El resultado son vectores de 384 dimensiones por turno, guardados en `feat_uc4_embeddings.npy`.

### Agregaciones por conversación y por usuario

Una vez que tenemos variables por turno, las agregamos:

**Por conversación:**
- Intent dominante (el que más aparece)
- Pooling de embeddings (promedio de los vectores de todos los turnos — una representación del "tema" de la conversación)
- Duración (cantidad de turnos)
- Canal (texto o voz)

**Por usuario:**
- Porcentaje de conversaciones de cada tipo de intent (¿el 60% de las veces habla de problemas?)
- Actividad conversacional reciente (¿cuánto hace que habló con Havi?)
- Diversidad de temas (¿siempre habla de lo mismo o toca muchos temas?)

### Señales cruzadas con datos transaccionales

Esta es la parte más valiosa de UC4. Conectamos los datos conversacionales con los transaccionales para encontrar patrones cruzados:

- **¿El usuario tuvo un rechazo y luego habló con Havi?** ¿En cuántos días lo hizo?
- **¿Mencionó fraude y tuvo transacciones en ciudades distintas a la suya?**
- **¿Preguntó por inversiones pero no tiene el producto?** (candidato caliente para UC3)
- **¿Preguntó por crédito y tiene alta utilización de crédito?** (señal de estrés financiero)

Estos cruces generan insights que ninguno de los dos datasets puede dar por sí solo. Es la ventaja competitiva más clara del proyecto.

### Outputs

| Archivo | Descripción |
|---|---|
| `feat_uc4_turns.parquet` | Variables por turno individual (intent, índices de referencia) |
| `feat_uc4_convs.parquet` | Variables por conversación (intent dominante, pooled embedding, duración, canal) |
| `feat_uc4_users.parquet` | Variables conversacionales agregadas por usuario |
| `feat_uc4_cross_summary.json` | Resumen de los cruces transaccional-conversacional más relevantes |
| `feat_uc4_embeddings.npy` | Matriz de embeddings MiniLM por turno (68 MB) |

---

## 8. Archivos generados

| Archivo | Tamaño | Descripción |
|---|---|---|
| `feat_uc1_user_risk.parquet` | 431 KB | Perfil de riesgo por usuario (UC1) |
| `feat_uc1_alertas.parquet` | 2.2 MB | Transacciones accionables para alertas (UC1) |
| `feat_uc2_personas.parquet` | 2.2 MB | Gemelo digital — ~70 variables por usuario (UC2) |
| `feat_uc3_candidates.parquet` | 1.5 MB | Candidatos usuario×producto para upselling (UC3) |
| `feat_uc4_turns.parquet` | 1.2 MB | Variables por turno conversacional (UC4) |
| `feat_uc4_convs.parquet` | 52 MB | Variables por conversación (incl. embeddings pooled) (UC4) |
| `feat_uc4_users.parquet` | 32 MB | Variables conversacionales por usuario (UC4) |
| `feat_uc4_cross_summary.json` | 615 B | Resumen de cruces transaccional-conversacional (UC4) |
| `feat_uc4_embeddings.npy` | 68 MB | Matriz de embeddings MiniLM (49,999 turnos × 384 dims) (UC4) |
| **Total** | **~159 MB** | |

El tamaño de `feat_uc4_convs.parquet` (52 MB) y `feat_uc4_users.parquet` (32 MB) se explica por los embeddings pooled almacenados dentro. Si en algún momento el almacenamiento es un problema, se pueden separar los embeddings de las variables categóricas.

---

## 9. ¿Qué sigue? — La fase de Modelado

Con los features construidos, entramos en la fase más "visible" del proyecto: entrenar los modelos. Acá es donde cada UC toma su camino:

### UC1 — Modelo de scoring de riesgo

Con el perfil de riesgo por usuario, vamos a entrenar (o construir con reglas) un sistema de scoring que le asigne a cada usuario un **nivel de alerta**: bajo, medio, alto, crítico. Para algunos tipos de alerta alcanza con reglas determinísticas (ej: "más de 5 rechazos en 7 días = alerta alta"). Para otros, vamos a usar un modelo supervisado que aprenda a combinar todas las variables de riesgo en un score único.

### UC2 — Clustering de personas financieras

Con las ~70 variables del gemelo digital, vamos a aplicar un algoritmo de **clustering** (probablemente K-Means o HDBSCAN) para agrupar a los 15,000 usuarios en 5–8 "personas financieras". El clustering es un algoritmo no supervisado — no le decimos de antemano cuántos grupos ni cuáles son, él los descubre en los datos.

El resultado va a ser algo como: "Persona 1: joven urbano con gastos diversificados y alto engagement digital", "Persona 2: usuario de nómina domiciliada con patrón de gasto conservador", etc.

Cada persona financiera va a tener un tono diferente de comunicación en Havi y va a recibir recomendaciones distintas.

### UC3 — Modelo de propensión a adopción

Con los candidatos usuario×producto, vamos a entrenar un modelo de clasificación binaria (¿este usuario va a adoptar este producto en los próximos 30 días: sí o no?) usando el label proxy como variable objetivo.

Candidatos naturales: **XGBoost** o **LightGBM**, que funcionan muy bien con tablas de features mixtas (numéricas + categóricas) y son interpretables vía importancia de variables.

El output va a ser un **score de propensión** por combinación usuario×producto, rankeado de mayor a menor. Havi va a usar ese ranking para decidir qué oferta mostrarle a cada usuario y cuándo.

### UC4 — Clasificador de intenciones + análisis de clusters semánticos

Con los embeddings y las variables conversacionales, podemos hacer dos cosas:

1. **Mejorar el clasificador de intenciones**: usando los embeddings como features de un modelo de clasificación supervisado, mejorar la accuracy de detección de intenciones más allá de las reglas de keywords.
2. **Descubrir clusters de conversaciones**: agrupar conversaciones semánticamente similares para descubrir patrones que las reglas de keywords no capturan. ¿Hay un grupo de conversaciones sobre "problemas con CODI en fin de semana"? ¿Sobre "dudas de inversión en usuarios nuevos"? Los clusters van a responder eso.

---

## Notas finales

Esta fase fue el trabajo más intenso del proyecto en términos de decisiones de diseño. Las variables que construimos acá van a determinar, en gran medida, qué tan bien funcionan los modelos. Cada variable fue pensada a partir de los insights del EDA y de la lógica de negocio de Hey Banco.

El criterio siempre fue el mismo: **¿esta variable le va a ayudar al modelo a entender mejor al usuario?** Si la respuesta era "tal vez pero no estamos seguros", la incluimos y la dejamos para que el modelo decida su importancia. Si la respuesta era "no tiene sentido financiero", la descartamos aunque los datos sugirieran correlación.

Buenas features + modelo mediocre > features mediocres + modelo excelente. Siempre.

---

*Reporte generado por el equipo datamoles — Datathon DSC x Hey 2026*
