// ============================================================
// HAVI — Gemini 2.5 Flash Service
// El gemelo digital (UC2) se inyecta como contexto del sistema
// NUNCA se expone al usuario
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
  { id: "p1", label: "¿Cómo voy este mes?", prompt: "¿Cómo voy con mis gastos este mes?" },
  { id: "p2", label: "Mis últimas compras", prompt: "Muéstrame mis últimas transacciones" },
  { id: "p3", label: "¿Qué es Hey Pro?", prompt: "¿Qué beneficios tiene Hey Pro para mí?" },
  { id: "p4", label: "Ahorrar más", prompt: "¿Cómo puedo ahorrar más este mes?" },
  { id: "p5", label: "Mis gastos por categoría", prompt: "¿En qué categorías gasto más?" },
  { id: "p6", label: "Alerta de cargo", prompt: "Tengo una duda sobre un cargo en mi cuenta" },
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
        model: "gemini-2.0-flash",
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
    if (msg.includes("cargo") || msg.includes("alerta") || msg.includes("fraude")) {
      return {
        text: `Detecté un cargo de $2,150 en Amazon US a las 3:14 AM desde Seattle. Ese horario y ubicación son inusuales para ti. ¿Lo reconoces? Si no fuiste tú, puedo bloquearlo ahora mismo 🛡️`,
        suggestions: ["Sí, fui yo", "No fui yo — bloquear", "Ver detalles del cargo"],
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
  | { type: "initiate_portability" };

export interface HaviResponse {
  text: string;
  suggestions: string[];
  action?: ChatAction;
  actionLabel?: string;
}

// ---- Wrapper con soporte UC2/UC3 ----------------------------
export async function sendHaviMessage(
  userMessage: string,
  transacciones?: Transaccion[]
): Promise<HaviResponse> {
  // UC2: intent de finanzas → respuesta con datos reales calculados
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

  // Delegación al servicio existente
  const result = await haviService.sendMessage(userMessage, {
    transacciones,
  });
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
