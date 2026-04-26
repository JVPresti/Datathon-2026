# UC4 · Bifurcación post-alerta — Diseño operativo

> **Owner**: Fernando Haro
> **Tipo**: documento de diseño (decisión + SLAs + pseudocódigo)
> **Notebook complementario**: [`notebooks/uc4/23_bifurcacion_post_alerta_uc4_fh.ipynb`](../../notebooks/uc4/23_bifurcacion_post_alerta_uc4_fh.ipynb)
> **Outputs vinculados**: `outputs/uc4/uc4_voz_patrones_respuesta.json`, `outputs/uc4/uc4_mocks_3_casos.json`

---

## 1. Contexto

Cuando UC4 detecta una transacción anómala, Havi envía una notificación al usuario
("¿Tú hiciste un cargo de $X en {comercio}?"). La respuesta del usuario debe disparar
**3 ramas** distintas en el backend, cada una con SLA propio y consecuencias diferentes.

## 2. Diagrama de flujo

```mermaid
flowchart TD
    A[Tx flagged por modelo o regla] --> B[Push notification + chat/voz<br/>SLA: emitir < 30 s post-tx]
    B --> C{Respuesta del usuario}

    C -- Sí, fui yo --> D[approveFlaggedTransaction<br/>SLA: 5 s desde respuesta]
    D --> D1[estatus = 'completada']
    D1 --> D2[Refuerzo positivo:<br/>'gracias por confirmar'<br/>+ feedback al modelo]

    C -- No fui yo --> E[blockCardAndRevert<br/>SLA: 10 s desde respuesta]
    E --> E1[estatus = 'revertida']
    E1 --> E2[producto bloqueado<br/>+ apertura de disputa<br/>+ envío de tarjeta nueva en 48h]

    C -- Sin respuesta 10 min --> F[Hold automático<br/>SLA: a los 10 min sin respuesta]
    F --> F1[estatus = 'en_disputa']
    F1 --> F2[Reintento por canal alternativo<br/>(voz si era texto y vice-versa)]
    F2 --> F3[Si tras 30 min sigue sin respuesta:<br/>escalación a backoffice humano]
```

## 3. SLAs detallados por rama

| Rama | Trigger | Acción inmediata | SLA emisión | SLA respuesta backend | Consecuencia |
|---|---|---|---:|---:|---|
| **A · Sí, fui yo** | input contiene `(sí|si|yo|fui yo|reconozco|confirmo)` | `approveFlaggedTransaction(transaccion_id)` | < 30 s post-detección | **5 s** | `estatus → completada`. Telemetría positiva al modelo. |
| **B · No fui yo** | input contiene `(no|no fui|no reconozco|nadie|alguien más|fraud)` | `blockCardAndRevert(producto_id, transaccion_id)` | < 30 s post-detección | **10 s** | `estatus → revertida` + bloqueo producto + disputa abierta. |
| **C · Sin respuesta** | sin input tras 10 min | `holdTransaction(transaccion_id) + retryAlternateChannel(user_id)` | trigger automático a los 10 min | **2 min** | `estatus → en_disputa`. Reintento canal opuesto; escalación humana a 30 min. |

### Justificación de los SLAs

Los SLAs surgen de la observación del corpus de voz (`channel_source=2`, n≈3,063 turnos):
- **Tiempo medio de respuesta del usuario en chat**: ~22 s (datos del corpus).
- **Tiempo medio de respuesta del usuario en voz**: ~9 s (más rápido por naturaleza síncrona).
- Por eso la rama **A** y **B** se calibran para responder antes que el usuario perciba lag.
- La ventana de 10 min para "sin respuesta" se basa en que el 87 % de las respuestas a alertas se dan dentro de los primeros 8 min según el corpus. 10 min cubre el long-tail razonable sin ser molesto.

## 4. Pseudocódigo Python por rama

```python
from datetime import datetime, timedelta
from enum import Enum

class RespuestaAlerta(str, Enum):
    SI_FUI_YO        = 'si_fui_yo'
    NO_FUI_YO        = 'no_fui_yo'
    SIN_RESPUESTA    = 'sin_respuesta'

REGEX_SI = r'(?i)\b(s[ií]|yo|fui yo|reconozco|confirmo|claro|aprobada|correcto)\b'
REGEX_NO = r'(?i)\b(no fui|no reconozco|no soy|nadie|fraude|robo|alguien (m[aá]s|hacke)|disputa)\b'

def clasificar_respuesta(input_usuario: str) -> RespuestaAlerta:
    """Decide la rama leyendo el texto del usuario. NO usa LLM, solo regex deterministas."""
    if input_usuario is None:
        return RespuestaAlerta.SIN_RESPUESTA
    txt = input_usuario.strip().lower()
    if not txt:
        return RespuestaAlerta.SIN_RESPUESTA
    # 'no' triunfa sobre 'sí' (mayor severidad → ante ambigüedad escalamos)
    import re
    if re.search(REGEX_NO, txt):
        return RespuestaAlerta.NO_FUI_YO
    if re.search(REGEX_SI, txt):
        return RespuestaAlerta.SI_FUI_YO
    return RespuestaAlerta.SIN_RESPUESTA  # fallback

def manejar_respuesta(transaccion_id: str, user_id: str, producto_id: str,
                     respuesta: RespuestaAlerta, alerta_emitida_at: datetime):
    """Despachador de las 3 ramas. Cumple SLAs por contrato del backend."""
    if respuesta == RespuestaAlerta.SI_FUI_YO:
        # Rama A — SLA 5 s
        approveFlaggedTransaction(transaccion_id)
        modelTelemetry.report_true_positive(transaccion_id, was_anomalous=False)
        sendChatMessage(user_id, "Listo, lo dejo pasar 👌")

    elif respuesta == RespuestaAlerta.NO_FUI_YO:
        # Rama B — SLA 10 s
        blockCardAndRevert(producto_id=producto_id, transaccion_id=transaccion_id)
        openDispute(transaccion_id, motivo='no_reconocido_por_usuario')
        scheduleNewCardDelivery(user_id, sla_dias=2)
        sendChatMessage(user_id,
            "Bloqueé tu tarjeta y reverté la operación. "
            "Te enviamos una nueva en máx. 48h. La disputa está abierta.")

    elif respuesta == RespuestaAlerta.SIN_RESPUESTA:
        # Rama C — disparo a los 10 min sin respuesta
        delta = datetime.utcnow() - alerta_emitida_at
        if delta < timedelta(minutes=10):
            return  # esperar
        holdTransaction(transaccion_id)
        canal_alternativo = 'voz' if alerta_emitida_at_canal == 'chat' else 'chat'
        retryAlternateChannel(user_id, canal=canal_alternativo, transaccion_id=transaccion_id)
        if delta >= timedelta(minutes=30):
            escalateToBackoffice(transaccion_id, user_id)
```

## 5. Métricas de salud del flujo

A monitorear en producción (Datadog / dashboards internos):

| Métrica | Objetivo | Alerta si |
|---|---:|---|
| `pct_alertas_respondidas_en_10min` | > 65 % | < 50 % por > 1 día |
| `pct_rama_si_fui_yo` | 60–75 % | fuera de rango → recalibrar modelo |
| `pct_rama_no_fui_yo` | 5–15 % | > 20 % → posible falso positivo masivo |
| `pct_sin_respuesta_30min` | < 10 % | > 20 % → revisar canal o copy del mensaje |
| `latencia_p95_rama_A_seg` | < 5 s | > 10 s |
| `latencia_p95_rama_B_seg` | < 10 s | > 20 s |

## 6. Riesgos conocidos

1. **Ambigüedad lingüística**: "no estoy seguro" → la regex actual lo trata como sin respuesta. Aceptable porque escala al canal alternativo.
2. **Spoofing de respuesta**: un atacante con acceso al chat podría responder "sí, fui yo". Mitigación: para montos > $10k MXN, exigir 2FA antes de aprobar (fuera de scope de este doc, lo gestiona el módulo de seguridad).
3. **Latencia push notification**: si el push tarda > 30 s, el SLA de la rama A es imposible. Depende del SDK de push provider.

## 7. Validación empírica

Ver el notebook hermano [`notebooks/uc4/23_bifurcacion_post_alerta_uc4_fh.ipynb`](../../notebooks/uc4/23_bifurcacion_post_alerta_uc4_fh.ipynb)
para:
- Estadísticas reales de respuesta en `channel_source=2` (voz).
- Match de patrones lingüísticos en el corpus (`outputs/uc4/uc4_voz_patrones_respuesta.json`).
- 3 casos mockeados con `transaccion_id` y `user_id` reales (`outputs/uc4/uc4_mocks_3_casos.json`).
