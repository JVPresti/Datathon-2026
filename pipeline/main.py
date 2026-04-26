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

from fastapi import FastAPI, HTTPException

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
    2. Llama a context_builder.build_context() para armar UC1-UC4 en tiempo real.
    3. Llama a models_loader.generate_havi_response() que inyecta el contexto en Gemini.
    4. Devuelve la respuesta y el contexto utilizado.
    """
    # 1. Validar usuario
    if user_id := request.user_id:
        if user_id not in DL.clientes_idx:
            raise HTTPException(status_code=404, detail=f"Usuario '{user_id}' no encontrado.")

    # 2. Ensamblar contexto real UC1-UC4
    context = build_context(request.user_id)

    # 3. Llamar a Gemini
    havi_text = generate_havi_response(
        user_id=request.user_id,
        context=context,
        user_message=request.message,
        model_name="gemini-2.5-flash",
    )

    # 4. Retornar respuesta
    return ChatResponse(
        response=havi_text,
        context_used=context,
    )
