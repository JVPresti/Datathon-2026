// ============================================================
// UPSELLING SERVICE — UC3 Motor de Upselling Empático
// Calcula cashback perdido real y dispara oferta Hey Pro
// ============================================================

import { Transaccion } from "../types";
import { TRANSACCIONES_MOCK, DEMO_USER } from "../data/mockData";

const CASHBACK_PCT = 0.01; // 1% cashback Hey Pro

// ---- Evaluación de elegibilidad UC3 -------------------------
export function evaluarElegibilidadUC3(): {
  es_elegible: boolean;
  tiene_hey_pro: boolean;
  razon_no_elegible?: string;
} {
  if (DEMO_USER.tiene_hey_pro) {
    return {
      es_elegible: false,
      tiene_hey_pro: true,
      razon_no_elegible: "Ya tiene Hey Pro",
    };
  }
  return { es_elegible: true, tiene_hey_pro: false };
}

// ---- Cálculo de cashback perdido el último mes --------------
export interface CashbackAnalysis {
  cashback_perdido_mes: number;
  cashback_anual_estimado: number;
  total_compras_mes: number;
  top_categoria: string;
  monto_top_categoria: number;
  transacciones_contadas: number;
}

export function calcularCashbackPerdido(
  transacciones: Transaccion[] = TRANSACCIONES_MOCK
): CashbackAnalysis {
  // Solo cargos (no ingresos, no anomalías de seguridad)
  const compras = transacciones.filter((t) => t.tipo === "cargo");

  const total_compras_mes = compras.reduce((sum, t) => sum + Math.abs(t.monto), 0);
  const cashback_perdido_mes = Math.round(total_compras_mes * CASHBACK_PCT * 100) / 100;
  const cashback_anual_estimado = Math.round(cashback_perdido_mes * 12 * 100) / 100;

  // Top categoría por gasto
  const porCategoria: Record<string, number> = {};
  for (const t of compras) {
    const cat = t.categoria || "otros";
    porCategoria[cat] = (porCategoria[cat] ?? 0) + Math.abs(t.monto);
  }

  const topEntry = Object.entries(porCategoria).sort(([, a], [, b]) => b - a)[0];
  const top_categoria = topEntry?.[0] ?? "tecnologia";
  const monto_top_categoria = topEntry?.[1] ?? 0;

  return {
    cashback_perdido_mes,
    cashback_anual_estimado,
    total_compras_mes,
    top_categoria,
    monto_top_categoria,
    transacciones_contadas: compras.length,
  };
}

// ---- Generador de contexto UC3 para Havi -------------------
export interface UC3PayloadHavi {
  usuario_pierde_cashback: number;
  cashback_anual_estimado: number;
  requisito_pro: string;
  top_categoria: string;
  nombre_usuario: string;
}

export function generarContextoUC3(
  transacciones: Transaccion[] = TRANSACCIONES_MOCK
): UC3PayloadHavi {
  const analysis = calcularCashbackPerdido(transacciones);

  return {
    usuario_pierde_cashback: analysis.cashback_perdido_mes,
    cashback_anual_estimado: analysis.cashback_anual_estimado,
    requisito_pro: "Domiciliar nómina en Hey Banco",
    top_categoria: analysis.top_categoria,
    nombre_usuario: DEMO_USER.nombre,
  };
}

// ---- Generador de mensaje proactivo UC3 ---------------------
export function generarMensajeProactivoUC3(payload: UC3PayloadHavi): {
  text: string;
  suggestions: string[];
  showPortabilityCTA: boolean;
} {
  const fmx = (n: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
    }).format(n);

  const text =
    `${payload.nombre_usuario}, una cosa antes de que sigas 💡 ` +
    `Con tus compras de este mes habrías ganado **${fmx(payload.usuario_pierde_cashback)}** en cashback con Hey Pro. ` +
    `Al año son **${fmx(payload.cashback_anual_estimado)}** de regreso a tu bolsillo. ` +
    `Solo necesitas domiciliar tu nómina aquí. ¿Te cuento cómo?`;

  return {
    text,
    suggestions: [
      "Sí, quiero activarlo",
      "¿Cuánto cuesta Hey Pro?",
      "Ahora no, gracias",
    ],
    showPortabilityCTA: true,
  };
}

// ---- Tool: initiatePayrollPortability -----------------------
export interface PayrollPortabilityResult {
  success: boolean;
  folio: string;
  pasos_restantes: number;
  proximo_paso: string;
  mensaje_confirmacion: string;
  tiempo_estimado_min: number;
}

let _portabilityInitiated = false;

export function initiatePayrollPortability(): PayrollPortabilityResult {
  _portabilityInitiated = true;
  const folio = `PORT-${Date.now().toString(36).toUpperCase()}`;

  return {
    success: true,
    folio,
    pasos_restantes: 3,
    proximo_paso: "Descarga tu CLABE interbancaria desde el menú de cuenta",
    mensaje_confirmacion:
      `✅ ¡Perfecto! Inicié tu proceso de portabilidad de nómina (folio: ${folio}). ` +
      `Son 3 pasos simples y en 2-3 días hábiles tu cashback Hey Pro estará activo. ` +
      `El primer paso es descargar tu CLABE desde Perfil → Cuenta. ¿Vamos?`,
    tiempo_estimado_min: 5,
  };
}

export function isPortabilityInitiated(): boolean {
  return _portabilityInitiated;
}

// ---- Clave de sesión para disparar UC3 una sola vez ---------
let _uc3FiredThisSession = false;

export function shouldFireUC3(): boolean {
  const elegibilidad = evaluarElegibilidadUC3();
  return elegibilidad.es_elegible && !_uc3FiredThisSession;
}

export function markUC3Fired(): void {
  _uc3FiredThisSession = true;
}
