"""
main.py — FastAPI: Orquestador de Havi con datos reales.

Arquitectura (ARQUITECTURA_PIPELINE.md):
  - Startup: carga todos los datasets en RAM (data_loader.DL.load())
  - POST /chat         → ensambla contexto UC1-UC4 real + llama a Gemini
  - GET  /context/full/{user_id} → devuelve el contexto ensamblado (debug)
  - GET  /health       → liveness probe
"""

from contextlib import asynccontextmanager
from datetime import datetime
import json
import time

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from data_loader import DL
from context_builder import build_context
from models_loader import generate_havi_response
from models_inference import ML
from schemas import ChatRequest, ChatResponse


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Carga los datasets y modelos ML en RAM al arrancar; libera recursos al apagar."""
    DL.load()
    ML.load()
    yield
    print("[Shutdown] Pipeline cerrado.")


app = FastAPI(
    title="Havi Orchestrator Pipeline",
    description="Pipeline de orquestación de Havi con Gemini y datos reales de Hey Banco.",
    version="2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health_check():
    """Liveness probe."""
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@app.get("/context/full/{user_id}")
def get_full_context(user_id: str):
    """
    Devuelve el contexto ensamblado de UC1-UC4 para un usuario real.
    Útil para depuración y para verificar qué información recibe Gemini.
    """
    # Validar que el usuario exista
    if user_id not in DL.clientes_idx:
        raise HTTPException(status_code=404, detail=f"Usuario '{user_id}' no encontrado en el dataset.")

    context = build_context(user_id)
    return {
        "user_id": user_id,
        "havi_context": context,
        "assembled_at": datetime.utcnow().isoformat(),
    }


@app.post("/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest):
    """
    Endpoint principal de conversación con Havi.

    Flujo:
    1. Valida que el user_id exista en los datos reales.
    2. Ensambla contexto UC1-UC4 real en tiempo real.
    3. Filtra UCs relevantes por keywords del mensaje.
    4. Llama a Gemini (con fallback contextual si Gemini falla).
    5. Devuelve respuesta + acciones sugeridas.
    """
    t_start = time.perf_counter()

    # 1. Validar usuario
    if request.user_id not in DL.clientes_idx:
        raise HTTPException(status_code=404, detail=f"Usuario '{request.user_id}' no encontrado.")

    # 2. Ensamblar contexto real UC1-UC4
    full_context = build_context(request.user_id)

    # 3. Seleccionar UCs relevantes por intención del mensaje
    msg = request.message.lower()
    context: dict = {
        "user_profile": full_context["user_profile"],
        "uc4": full_context["uc4"],
    }

    if any(k in msg for k in ["pago", "rechazo", "netflix", "comprar", "no pasó", "tarjeta", "cargo"]):
        context["uc1"] = full_context["uc1"]
    if any(k in msg for k in ["fin de mes", "gasto", "liquidez", "ahorro", "cuanto", "proyecc", "queda", "mes"]):
        context["uc2"] = full_context["uc2"]
    if any(k in msg for k in ["beneficio", "hey pro", "ganar", "puntos", "cashback", "pro", "activ"]):
        context["uc3"] = full_context["uc3"]
    if any(k in msg for k in ["fraude", "no reconozco", "extraño", "sospechoso", "seguridad", "bloque", "atípic"]):
        context["uc1"] = full_context["uc1"]

    # Default: incluir UC1 + UC2 si ningún intent fue detectado
    if len(context) <= 2:
        context["uc1"] = full_context["uc1"]
        context["uc2"] = full_context["uc2"]

    # Debug: contexto que recibe el orquestador / Gemini (después del filtrado por intención)
    print("\n" + "=" * 80)
    print(f">>> [/chat] CONTEXTO ENVIADO A HAVI | user_id={request.user_id}")
    print(f">>> mensaje_usuario: {request.message!r}")
    print(">>> keys en context:", list(context.keys()))
    try:
        print(json.dumps(context, indent=2, ensure_ascii=False, default=str))
    except TypeError as e:
        print(f">>> (json.dumps falló: {e}) context repr truncado:", repr(context)[:2000])
    print("=" * 80 + "\n")

    # 4. Generar respuesta (Gemini o fallback contextual)
    havi_res = generate_havi_response(
        user_id=request.user_id,
        context=context,
        user_message=request.message,
        model_name="gemini-3.1-flash-lite",
    )

    elapsed = time.perf_counter() - t_start
    print(f"[/chat] {request.user_id} — total {elapsed:.2f}s")

    return ChatResponse(
        response=havi_res.get("text", ""),
        actions=havi_res.get("actions", []),
        context_used=context,
    )
