// ============================================================
// HAVI — Chat Service
// Primary path: pipeline POST /chat (Gemini + UC1-UC4 context)
// Fallback: local demo responses when pipeline is unavailable
// ============================================================

import { GoogleGenerativeAI } from "@google/generative-ai";
import { UC2Context, HaviAlert, Transaccion, SuggestionPill } from "../types";
import { DEMO_USER, UC2_MOCK } from "../data/mockData";
import {
  detectarIntentFinanzas,
  generarContextoUC2,
  generarRespuestaUC2,
  setCategoryBudgetLimit,
  SetBudgetResult,
} from "./digitalTwinService";
import {
  generarContextoUC3,
  generarMensajeProactivoUC3,
  initiatePayrollPortability,
  PayrollPortabilityResult,
} from "./upsellingService";
import { pipelineClient, PipelineChatAction } from "./apiClient";

// ⚠️ En producción esto va en variables de entorno
// Para el prototipo se configura desde la app
let GEMINI_API_KEY = "";

export function setGeminiApiKey(key: string) {
  GEMINI_API_KEY = key;
}

// ---- SYSTEM PROMPT (contiene el gemelo digital) ------------
function buildSystemPrompt(uc2: UC2Context): string {
  return `Eres Havi, el copiloto financiero de Hey Banco. Eres proactivo, empático y directo. 
Tu tono es como el de un amigo financiero de confianza — cercano, sin tecnicismos innecesarios.
Siempre respondes en español.

CONTEXTO PRIVADO DEL USUARIO (no menciones estos datos directamente, úsalos para personalizar):
- Zona de riesgo financiero: ${uc2.zona_riesgo}
- Tendencia: ${uc2.tendencia_riesgo}
- Gasto estimado fin de mes: $${uc2.gasto_estimado_fin_mes.toLocaleString("es-MX")} MXN
- Ingreso mensual: $${uc2.ingreso_mensual.toLocaleString("es-MX")} MXN  
- Déficit proyectado: ${uc2.deficit_proyectado < 0 ? `$${Math.abs(uc2.deficit_proyectado).toLocaleString("es-MX")} MXN en déficit` : "sin déficit"}
- Categoría problema: ${uc2.categoria_problema}
- Días al corte: ${uc2.dias_al_corte} días
- Mensualidades pendientes: $${uc2.mensualidades_pendientes.toLocaleString("es-MX")} MXN

INSTRUCCIONES:
- No menciones scores, zonas de riesgo ni porcentajes de la salud financiera al usuario
- Usa el contexto para anticiparte a sus necesidades y dar consejos relevantes
- Cuando des consejos de gasto, sé específico pero no invasivo
- Si preguntan por gastos/transacciones, usa los datos que te comparten
- Máximo 3 oraciones por respuesta a menos que pidan detalle
- Al final de cada respuesta incluye exactamente 3 sugerencias de seguimiento en formato JSON:
  {"suggestions": ["texto pill 1", "texto pill 2", "texto pill 3"]}

Nombre del usuario: ${DEMO_USER.nombre}`;
}

// ---- PILLS DE SUGERENCIA INICIALES -------------------------
export const INITIAL_PILLS: SuggestionPill[] = [
  { id: "p1", label: "Simular fin de mes", prompt: "Corre una simulación de mi gemelo digital y dime cómo terminaré el mes si sigo gastando igual" },
  { id: "p2", label: "¿Cómo voy este mes?", prompt: "¿Cómo voy con mis gastos este mes?" },
  { id: "p3", label: "¿Cuánto perdí sin Hey Pro?", prompt: "¿Cuánto cashback perdí este mes por no tener Hey Pro activo?" },
  { id: "p4", label: "Hay un cargo raro", prompt: "Vi un cargo que no reconozco en mi cuenta, ¿puede ser fraude?" },
  { id: "p5", label: "Mis gastos por categoría", prompt: "¿En qué categorías gasto más este mes?" },
  { id: "p6", label: "Activar Hey Pro", prompt: "¿Cómo activo Hey Pro y qué necesito?" },
];

// ---- GEMINI CHAT SERVICE -----------------------------------
export class HaviChatService {
  private history: Array<{ role: string; parts: Array<{ text: string }> }> = [];
  private isDemo = false;

  constructor(useDemo = false) {
    this.isDemo = useDemo;
  }

  async sendMessage(
    userMessage: string,
    context?: {
      transacciones?: Transaccion[];
      alertaActiva?: HaviAlert;
    }
  ): Promise<{ text: string; suggestions: string[] }> {
    if (this.isDemo || !GEMINI_API_KEY) {
      return this.demoResponse(userMessage);
    }

    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: "gemini-3.1-flash-lite-preview",
        systemInstruction: buildSystemPrompt(UC2_MOCK),
      });

      // Agrega contexto extra al mensaje si hay alerta activa
      let fullMessage = userMessage;
      if (context?.alertaActiva) {
        fullMessage = `[CONTEXTO: El usuario está consultando sobre la alerta: "${context.alertaActiva.titulo}". ${context.alertaActiva.mensaje}]\n\n${userMessage}`;
      }
      if (context?.transacciones) {
        const txnResumen = context.transacciones
          .slice(0, 5)
          .map(
            (t) =>
              `${t.comercio}: ${t.monto > 0 ? "+" : ""}$${Math.abs(t.monto).toLocaleString("es-MX")} (${t.categoria})`
          )
          .join(", ");
        fullMessage = `[TRANSACCIONES RECIENTES: ${txnResumen}]\n\n${userMessage}`;
      }

      const chat = model.startChat({ history: this.history });
      const result = await chat.sendMessage(fullMessage);
      const responseText = result.response.text();

      // Actualiza historial
      this.history.push(
        { role: "user", parts: [{ text: fullMessage }] },
        { role: "model", parts: [{ text: responseText }] }
      );

      return this.parseResponse(responseText);
    } catch (error) {
      console.error("Gemini error:", error);
      return this.demoResponse(userMessage);
    }
  }

  private parseResponse(raw: string): { text: string; suggestions: string[] } {
    try {
      const jsonMatch = raw.match(/\{"suggestions":\s*\[.*?\]\}/s);
      if (jsonMatch) {
        const jsonData = JSON.parse(jsonMatch[0]);
        const text = raw.replace(jsonMatch[0], "").trim();
        return { text, suggestions: jsonData.suggestions || [] };
      }
    } catch {}
    return { text: raw, suggestions: ["Ver mis gastos", "Pedir consejo", "Hablar de Hey Pro"] };
  }

  private demoResponse(message: string): { text: string; suggestions: string[] } {
    const msg = message.toLowerCase();

    if (msg.includes("gasto") || msg.includes("mes")) {
      return {
        text: `Este mes llevas $14,320 gastados, Valentina. Tu categoría con más movimiento es restaurantes 🍽️. Con 8 días al corte, vas un poco arriba de tu ritmo habitual.`,
        suggestions: ["¿Puedo reducir gastos?", "Desglose por categoría", "Mis compras recientes"],
      };
    }
    if (msg.includes("transacc") || msg.includes("compra")) {
      return {
        text: `Tus últimos cargos incluyen Uber Eats ($285), Amazon US ($2,150 — ese lo marqué como inusual), Walmart ($1,240) y Netflix ($219). ¿Quieres que revisemos alguno?`,
        suggestions: ["¿Qué es inusual?", "Filtrar por categoría", "Ver todo el historial"],
      };
    }
    if (msg.includes("hey pro") || msg.includes("cashback")) {
      return {
        text: `Con tus compras de este mes habrías ganado $387.50 en cashback con Hey Pro 💳. Al año serían $4,650 de regreso. ¿Quieres ver cómo activarlo?`,
        suggestions: ["Activar Hey Pro", "¿Cuánto me cuesta?", "Ver mis beneficios actuales"],
      };
    }
    if (msg.includes("ahorrar") || msg.includes("ahorro")) {
      return {
        text: `La categoría donde más puedes optimizar es restaurantes. Si reduces un 20%, liberarías ~$500 MXN antes del corte. También puedes poner un límite y te aviso cuando te acerques 🎯`,
        suggestions: ["Poner límite en restaurantes", "Ver otros gastos", "¿Cuánto tengo libre?"],
      };
    }
    if (msg.includes("cargo") || msg.includes("alerta") || msg.includes("fraude") || msg.includes("raro") || msg.includes("reconoc")) {
      return {
        text: `Detecté un cargo de $2,150 en Amazon US a las 3:14 AM desde Seattle. Ese horario y ubicación son inusuales para ti. ¿Lo reconoces? Si no fuiste tú, puedo bloquearlo ahora mismo 🛡️`,
        suggestions: ["Sí, fui yo", "Ver detalles del cargo", "¿Qué pasa si bloqueo?"],
        action: {
          type: "report_fraud",
          transaccion_id: "txn-amazon-us-001",
          comercio: "Amazon US",
          monto: 2150,
        },
        actionLabel: "No fui yo — bloquear tarjeta 🛡️",
      };
    }

    return {
      text: `Entendido, Valentina. Estoy aquí para ayudarte con tus finanzas. Puedo mostrarte tus gastos, alertarte sobre movimientos inusuales o ayudarte a sacarle más provecho a tu cuenta Hey 😊`,
      suggestions: ["¿Cómo voy este mes?", "Revisar alertas", "Consejos de ahorro"],
    };
  }

  clearHistory() {
    this.history = [];
  }
}

// Instancia singleton
export const haviService = new HaviChatService(true); // demo mode

// ---- Tipos de acciones rápidas de chat ----------------------
export type ChatAction =
  | { type: "set_budget"; categoria: string; limite: number }
  | { type: "initiate_portability" }
  | { type: "report_fraud"; transaccion_id: string; comercio: string; monto: number }
  | { type: "move_funds"; amount: number };

export interface HaviResponse {
  text: string;
  suggestions: string[];
  action?: ChatAction;
  actionLabel?: string;
}

// ---- Detect pipeline-level errors (Gemini down, key expired, etc.) ----

function isPipelineError(text: string): boolean {
  if (!text) return true;
  const errorMarkers = [
    "Error interno en Havi",
    "API key expired",
    "INVALID_ARGUMENT",
    "API_KEY_INVALID",
    "Error interno",
    "generativelanguage.googleapis.com",
  ];
  return errorMarkers.some((m) => text.includes(m));
}

// ---- Pipeline action_id → App ChatAction mapping -----------

function mapPipelineActions(actions: PipelineChatAction[]): {
  suggestions: string[];
  action?: ChatAction;
  actionLabel?: string;
} {
  const suggestions: string[] = [];
  let action: ChatAction | undefined;
  let actionLabel: string | undefined;

  for (const a of actions) {
    if (!action && (a.action_id === "activate_hey_pro" || a.action_id === "upselling_pro")) {
      action = { type: "initiate_portability" };
      actionLabel = a.label;
    } else if (!action && a.action_id === "set_category_limit") {
      const categoria = a.payload?.category ?? "general";
      const limite = a.payload?.limit ?? 500;
      action = { type: "set_budget", categoria, limite };
      actionLabel = a.label;
    } else if (!action && (a.action_id === "report_fraud" || a.action_id === "block_card" || a.action_id === "confirm_transaction")) {
      action = {
        type: "report_fraud",
        transaccion_id: a.payload?.transaccion_id ?? "txn-unknown",
        comercio: a.payload?.comercio ?? "Comercio desconocido",
        monto: a.payload?.monto ?? 0,
      };
      actionLabel = a.label ?? "No fui yo — bloquear tarjeta 🛡️";
    } else if (!action && a.action_id === "move_funds_from_investment") {
      action = { type: "move_funds", amount: a.payload?.amount ?? 0 };
      actionLabel = a.label ?? "Mover fondos";
    } else {
      // Everything else becomes a suggestion pill
      suggestions.push(a.label);
    }
  }

  // Guarantee at least 3 suggestion pills
  if (suggestions.length < 3) {
    const fallbacks = ["¿Cómo voy este mes?", "Ver mis alertas", "Consejos de ahorro"];
    for (const fb of fallbacks) {
      if (!suggestions.includes(fb)) suggestions.push(fb);
      if (suggestions.length >= 3) break;
    }
  }

  return { suggestions: suggestions.slice(0, 4), action, actionLabel };
}

// ---- Wrapper con soporte UC2/UC3 ----------------------------
export async function sendHaviMessage(
  userMessage: string,
  transacciones?: Transaccion[]
): Promise<HaviResponse> {
  // ── PRIMARY: pipeline POST /chat ──────────────────────────
  try {
    const pipelineRes = await pipelineClient.sendChat(DEMO_USER.user_id, userMessage);

    // Detect Gemini errors forwarded as 200 OK from pipeline
    if (isPipelineError(pipelineRes.response)) {
      console.warn("[HaviService] Pipeline returned Gemini error — using local fallback");
      throw new Error("pipeline_gemini_error");
    }

    const { suggestions, action, actionLabel } = mapPipelineActions(pipelineRes.actions);
    console.info("[HaviService] ✓ Pipeline response received");
    return {
      text: pipelineRes.response,
      suggestions,
      action,
      actionLabel,
    };
  } catch (pipelineError) {
    console.warn("[HaviService] Pipeline unavailable, using local fallback:", pipelineError);
  }

  // ── FALLBACK: local UC2 intent detection ──────────────────
  if (detectarIntentFinanzas(userMessage)) {
    const payload = generarContextoUC2(transacciones);
    const uc2Response = generarRespuestaUC2(payload);
    return {
      text: uc2Response.text,
      suggestions: uc2Response.suggestions,
      action: uc2Response.showBudgetCTA
        ? {
            type: "set_budget",
            categoria: uc2Response.budgetSugerido.categoria,
            limite: uc2Response.budgetSugerido.limite,
          }
        : undefined,
      actionLabel: uc2Response.showBudgetCTA ? "Sí, ponme el límite" : undefined,
    };
  }

  // ── FINAL FALLBACK: demo responses ────────────────────────
  const result = await haviService.sendMessage(userMessage, { transacciones });
  return { text: result.text, suggestions: result.suggestions };
}

// ---- Ejecución de tool: setCategoryBudgetLimit --------------
export function executeBudgetLimit(
  categoria: string,
  limite: number
): HaviResponse {
  const result: SetBudgetResult = setCategoryBudgetLimit(categoria, limite);
  return {
    text: result.mensaje_confirmacion,
    suggestions: ["Ver mis gastos ahora", "¿Qué más puedo optimizar?", "¿Cómo voy hoy?"],
  };
}

// ---- Ejecución de tool: initiatePayrollPortability ----------
export function executePayrollPortability(): HaviResponse {
  const result: PayrollPortabilityResult = initiatePayrollPortability();
  return {
    text: result.mensaje_confirmacion,
    suggestions: [
      "¿Cuántos días tarda?",
      "Ver beneficios de Hey Pro",
      "¿Cómo descargo mi CLABE?",
    ],
  };
}

// ---- Ejecución de tool: reportFraud / block card ------------
export function executeFraudReport(
  transaccion_id: string,
  comercio: string,
  monto: number
): HaviResponse {
  // Simula el resultado de bloquear la tarjeta y abrir disputa
  return {
    text: `✅ Listo. Bloqueé el cargo de $${monto.toLocaleString("es-MX")} en **${comercio}** y abrí una disputa (ID: DISP-${transaccion_id.slice(-4).toUpperCase()}). Tu tarjeta está **bloqueada temporalmente** y recibirás una nueva en 3–5 días hábiles. Tu saldo no se verá afectado durante la investigación.`,
    suggestions: ["¿Cuándo me regresan el dinero?", "¿Cómo rastrea mi disputa?", "Revisar mis cargos recientes"],
  };
}
