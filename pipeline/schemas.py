from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class ChatRequest(BaseModel):
    user_id: str = Field(..., description="ID del usuario en Hey Banco")
    message: str = Field(..., description="El mensaje que el usuario le envía a Havi")

class ChatAction(BaseModel):
    label: str = Field(..., description="Texto que verá el usuario en el botón")
    action_id: str = Field(..., description="ID técnico de la acción (e.g. 'retry_payment')")
    payload: Optional[Dict[str, Any]] = Field(None, description="Datos extra para ejecutar la acción")

class ChatResponse(BaseModel):
    response: str = Field(..., description="Respuesta generada por Havi")
    actions: List[ChatAction] = Field(default_factory=list, description="Lista de acciones sugeridas para el front-end")
    context_used: Dict[str, Any] = Field(default_factory=dict, description="El contexto consolidado de UC1-UC4 que se utilizó")

# Modelos simulados de contexto de acuerdo a ARQUITECTURA_PIPELINE.md
class Alert(BaseModel):
    alert_type: str
    priority: str
    message: str
    context: Dict[str, Any]

class UC1Context(BaseModel):
    alerts: List[Alert] = []

class UC2Context(BaseModel):
    persona: str
    key_traits: List[str]
    metrics: Dict[str, Any]

class Recommendation(BaseModel):
    producto: str
    reason: str
    expected_value_mxn: Optional[float] = None

class UC3Context(BaseModel):
    recommendations: List[Recommendation] = []

class Turn(BaseModel):
    role: str
    content: str
    ts: str

class UC4Context(BaseModel):
    recent_turns: List[Turn] = []
    intent_top: str = ""
    menciona_fraude: bool = False

class HaviContext(BaseModel):
    user_profile: Dict[str, Any]
    uc1: UC1Context
    uc2: UC2Context
    uc3: UC3Context
    uc4: UC4Context
