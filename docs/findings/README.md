# Findings — datamoles · Hey Datathon 2026

> Consolidación ejecutiva de los hallazgos de la fase de **EDA**.
> Fuente: 12 notebooks + 1 script Python ejecutados sobre los 4 datasets.
> Estado: **EDA cerrado · listo para Feature Engineering.**

## Cómo está organizado

| Archivo | Para qué sirve | Audiencia |
|---|---|---|
| [`00_GENERAL.md`](./00_GENERAL.md) | Foto integral del dataset: volumen, integridad referencial, calidad de datos, segmentos transversales | Todos |
| [`UC1_anomalias_y_alertas.md`](./UC1_anomalias_y_alertas.md) | Hallazgos para el **Asistente Proactivo** (rechazos, atípicos, alertas) | Owner UC1 (Fernando) |
| [`UC2_gemelo_digital.md`](./UC2_gemelo_digital.md) | Hallazgos para el **Digital Twin** (perfilado, RFM, MCC, compromisos) | Owner UC2 (Brayan) |
| [`UC3_upselling.md`](./UC3_upselling.md) | Hallazgos para **Upselling** (cashback perdido, portafolio, propensión) | Owner UC3 (Jorge) |
| [`UC4_conversacional.md`](./UC4_conversacional.md) | Hallazgos para **Conversacional** (intents, voz/texto, cruces NLP×txn) | Owners UC4 (Fernando + Jorge) |

Y, como puente a la siguiente fase:

- [`../FEATURE_ENGINEERING_PLAN.md`](../FEATURE_ENGINEERING_PLAN.md) — qué features construir, en qué notebook, con qué owner.

## Reglas de convivencia

1. **No re-derivar**: si un número está en `00_GENERAL.md`, citarlo en vez de recalcular.
2. **Trazabilidad**: cada bloque de hallazgos referencia el notebook fuente con su path nuevo (`notebooks/<...>`).
3. **Estado por hallazgo**:
   - ✅ Confirmado con outputs ejecutados.
   - ⚠️ Esperando re-ejecución (notebook con `outputs: []`).
   - 🧪 Hipótesis del autor; aún sin métrica.
4. **Updates**: cualquier nuevo hallazgo cierra abriendo PR sobre el `.md` correspondiente, no sobre el notebook.

## Glosario rápido

- **UC1**: Asistente Financiero Proactivo (alertas).
- **UC2**: Gemelo Digital (perfil conductual).
- **UC3**: Upselling Inteligente (recomendación de productos).
- **UC4**: Inteligencia Conversacional (intents + cruces).
- **MCC**: Merchant Category Code (`categoria_mcc`).
- **Hey Pro**: suscripción premium que habilita cashback (1% sobre `compra` + `completada`).
- **RFM**: Recency · Frequency · Monetary.
