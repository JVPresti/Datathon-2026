# Definición de Acciones de Havi — Catálogo Técnico

Este documento detalla las acciones interactivas que el asistente Havi puede enviar al Front-end (App) para cada uno de los 4 Casos de Uso (UC). Cada acción incluye un `action_id` único y el contexto en el que se dispara.

---

## UC1: Financial Copilot (Resolución de Fricciones)
**Objetivo:** Ayudar al usuario cuando una transacción es rechazada por falta de fondos.

| action_id | Label (Botón) | Descripción | Payload Estructurado |
| :--- | :--- | :--- | :--- |
| `move_funds_from_investment` | "Mover fondos desde Inversión" | Transfiere dinero de Inversión Hey a Débito para cubrir el monto faltante. | `{"amount": float, "currency": "MXN"}` |
| `retry_payment` | "Reintentar pago ahora" | Vuelve a ejecutar la transacción que falló tras haber movido fondos. | `{"merchant": "string", "amount": float}` |
| `view_investment_balance` | "Ver mi Inversión Hey" | Abre la pantalla de inversión para que el usuario verifique su saldo. | `{}` |

---

## UC2: Gemelo Digital (Simulador de Salud)
**Objetivo:** Mitigar riesgos de liquidez antes de que ocurran mediante límites preventivos.

| action_id | Label (Botón) | Descripción | Payload Estructurado |
| :--- | :--- | :--- | :--- |
| `set_category_limit` | "Configurar límite en [Categoría]" | Establece un techo de gasto semanal para una categoría específica (ej. Delivery). | `{"category": "string", "limit": float}` |
| `view_financial_forecast` | "Ver mi proyección mensual" | Muestra la gráfica del "Viajero del Tiempo" con el saldo proyectado a fin de mes. | `{"target_month": "string"}` |
| `adjust_recurring_payment` | "Pausar cargo recurrente" | Permite posponer o cancelar una suscripción para priorizar créditos. | `{"merchant": "string"}` |

---

## UC3: Upselling Empático (Hiper-Segmentación)
**Objetivo:** Convertir usuarios a productos de mayor valor (Hey Pro) demostrando ahorro real.

| action_id | Label (Botón) | Descripción | Payload Estructurado |
| :--- | :--- | :--- | :--- |
| `activate_hey_pro` | "Activar Hey Pro ahora" | Proceso de 2 clics para obtener beneficios de cashback y tasa. | `{"estimated_cashback": float}` |
| `start_payroll_transfer` | "Traer mi nómina" | Inicia el flujo de portabilidad de nómina para cumplir requisitos de Hey Pro. | `{}` |
| `view_cashback_simulator` | "Ver cuánto he perdido" | Muestra al usuario el cálculo exacto de cashback no ganado el mes anterior. | `{"lost_amount": float}` |

---

## UC4: Seguridad Inteligente (Anomaly Detection)
**Objetivo:** Resolver sospechas de fraude sin bloquear al usuario legítimo.

| action_id | Label (Botón) | Descripción | Payload Estructurado |
| :--- | :--- | :--- | :--- |
| `confirm_transaction` | "Sí, soy yo (Liberar)" | Valida la transacción atípica y la libera para que se complete. | `{"transaction_id": "string", "amount": float}` |
| `block_card_temporarily` | "No soy yo (Bloquear)" | Bloquea el plástico de forma inmediata y ofrece reposición digital. | `{"reason": "string"}` |
| `chat_with_agent` | "Hablar con un humano" | Escala la conversación a un agente de seguridad si la IA no resuelve la duda. | `{}` |

---

## Estructura del Payload JSON (ChatResponse)

Havi enviará las acciones dentro del array `actions` en cada turno de respuesta:

```json
{
  "text": "Noté que tu pago en Netflix falló. Tienes saldo en tu Inversión, ¿quieres moverlo?",
  "actions": [
    {
      "label": "Mover $200 de Inversión",
      "action_id": "move_funds_from_investment",
      "payload": { "amount": 200 }
    },
    {
      "label": "Reintentar pago",
      "action_id": "retry_payment",
      "payload": { "merchant": "Netflix" }
    }
  ]
}
```
