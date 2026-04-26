// ============================================================
// DIGITAL TWIN SERVICE — UC2 "Viajero del Tiempo"
// Agrega transacciones reales, calcula contexto financiero
// y expone herramientas mock para Havi
// ============================================================

import { Transaccion } from "../types";
import { TRANSACCIONES_MOCK, DEMO_USER } from "../data/mockData";

// ---- Compromisos fijos mock (en producción: API backend) ----
export const COMPROMISOS_FIJOS_MOCK: Record<string, number> = {
  mensualidad_auto: 3_200,
  renta: 0,
  servicios: 450,
};

// ---- Agregación de gastos por categoría (mes actual) --------
export interface GastoPorCategoria {
  categoria: string;
  total: number;
  transacciones: number;
}

export function agregarGastosPorCategoria(
  transacciones: Transaccion[] = TRANSACCIONES_MOCK
): GastoPorCategoria[] {
  const map: Record<string, GastoPorCategoria> = {};

  for (const txn of transacciones) {
    if (txn.tipo !== "cargo") continue;
    const cat = txn.categoria || "otros";
    if (!map[cat]) {
      map[cat] = { categoria: cat, total: 0, transacciones: 0 };
    }
    map[cat].total += Math.abs(txn.monto);
    map[cat].transacciones += 1;
  }

  return Object.values(map).sort((a, b) => b.total - a.total);
}

// ---- Cálculo de ingreso restante estimado -------------------
export interface ResumenFinanciero {
  ingreso_mensual: number;
  gasto_acumulado_mes: number;
  compromisos_fijos_total: number;
  ingreso_restante_estimado: number;
  gasto_delivery_actual: number;
  mensualidad_auto: number;
  categorias: GastoPorCategoria[];
  deficit_proyectado: number;
}

export function calcularResumenFinanciero(
  transacciones: Transaccion[] = TRANSACCIONES_MOCK
): ResumenFinanciero {
  const categorias = agregarGastosPorCategoria(transacciones);
  const gasto_acumulado_mes = categorias.reduce((sum, c) => sum + c.total, 0);

  const compromisos_fijos_total = Object.values(COMPROMISOS_FIJOS_MOCK).reduce(
    (sum, v) => sum + v,
    0
  );

  const ingreso_mensual = DEMO_USER.ingreso_mensual;

  // Delivery = restaurante en este mock (categoría MCC equivalente)
  const deliveryCat = categorias.find(
    (c) => c.categoria === "restaurante" || c.categoria === "delivery"
  );
  const gasto_delivery_actual = deliveryCat?.total ?? 0;
  const mensualidad_auto = COMPROMISOS_FIJOS_MOCK.mensualidad_auto;

  const ingreso_restante_estimado =
    ingreso_mensual - gasto_acumulado_mes - compromisos_fijos_total;

  const deficit_proyectado = ingreso_restante_estimado < 0 ? ingreso_restante_estimado : 0;

  return {
    ingreso_mensual,
    gasto_acumulado_mes,
    compromisos_fijos_total,
    ingreso_restante_estimado,
    gasto_delivery_actual,
    mensualidad_auto,
    categorias,
    deficit_proyectado,
  };
}

// ---- Generador de contexto UC2 para Havi -------------------
export interface UC2PayloadHavi {
  gasto_delivery_actual: number;
  mensualidad_auto: number;
  ingreso_restante_estimado: number;
  gasto_acumulado_mes: number;
  ingreso_mensual: number;
  deficit_proyectado: number;
  top_categorias: { categoria: string; total: number }[];
}

export function generarContextoUC2(
  transacciones: Transaccion[] = TRANSACCIONES_MOCK
): UC2PayloadHavi {
  const resumen = calcularResumenFinanciero(transacciones);

  return {
    gasto_delivery_actual: resumen.gasto_delivery_actual,
    mensualidad_auto: resumen.mensualidad_auto,
    ingreso_restante_estimado: resumen.ingreso_restante_estimado,
    gasto_acumulado_mes: resumen.gasto_acumulado_mes,
    ingreso_mensual: resumen.ingreso_mensual,
    deficit_proyectado: resumen.deficit_proyectado,
    top_categorias: resumen.categorias.slice(0, 3).map((c) => ({
      categoria: c.categoria,
      total: c.total,
    })),
  };
}

// ---- Detección de intent UC2 --------------------------------
export function detectarIntentFinanzas(mensaje: string): boolean {
  const msg = mensaje.toLowerCase();
  return (
    msg.includes("cómo andan mis finanzas") ||
    msg.includes("como andan mis finanzas") ||
    msg.includes("cómo voy") ||
    msg.includes("como voy") ||
    msg.includes("mis finanzas") ||
    msg.includes("situación financiera") ||
    msg.includes("alerta quincena") ||
    msg.includes("cómo estoy") ||
    msg.includes("como estoy") ||
    (msg.includes("gasto") && msg.includes("mes"))
  );
}

// ---- Respuesta UC2 con discrepancia matemática ---------------
export function generarRespuestaUC2(payload: UC2PayloadHavi): {
  text: string;
  suggestions: string[];
  showBudgetCTA: boolean;
  budgetSugerido: { categoria: string; limite: number };
} {
  const fmx = (n: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
    }).format(Math.abs(n));

  const topCat = payload.top_categorias[0];
  const tieneDeficit = payload.ingreso_restante_estimado < 0;

  let text = `Valentina, te cuento cómo van tus finanzas este mes 📊\n\n`;
  text += `Llevas ${fmx(payload.gasto_acumulado_mes)} gastados de ${fmx(payload.ingreso_mensual)} de ingreso. `;
  text += `Sumando tu mensualidad del auto (${fmx(payload.mensualidad_auto)}), `;

  if (tieneDeficit) {
    text += `me da que te **faltan ${fmx(Math.abs(payload.ingreso_restante_estimado))}** para cerrar el mes 😬. `;
    text += `La categoría que más pesa es **${topCat?.categoria ?? "restaurantes"}** con ${fmx(topCat?.total ?? 0)}.`;
  } else {
    text += `aún tienes ${fmx(payload.ingreso_restante_estimado)} de margen. `;
    if (payload.gasto_delivery_actual > 400) {
      text += `Eso sí, noto que llevas ${fmx(payload.gasto_delivery_actual)} en restaurantes/delivery este mes — un poco alto. `;
    }
  }

  const showBudgetCTA = payload.gasto_delivery_actual > 300;
  const budgetSugerido = { categoria: "delivery", limite: 500 };

  if (showBudgetCTA) {
    text += `\n\n¿Quiero ponerte un límite de ${fmx(budgetSugerido.limite)} en delivery para que no se dispare? 🎯`;
  }

  return {
    text,
    suggestions: [
      "Sí, ponme el límite",
      "Ver mis categorías de gasto",
      "¿Cómo puedo ahorrar más?",
    ],
    showBudgetCTA,
    budgetSugerido,
  };
}

// ---- Tool: setCategoryBudgetLimit ---------------------------
export interface SetBudgetResult {
  success: boolean;
  categoria: string;
  limite_anterior: number | null;
  limite_nuevo: number;
  mensaje_confirmacion: string;
}

// Estado mock en memoria (simula persistencia)
let _budgetLimits: Record<string, number> = {};

export function setCategoryBudgetLimit(
  categoria: string,
  limite: number
): SetBudgetResult {
  const anterior = _budgetLimits[categoria] ?? null;
  _budgetLimits[categoria] = limite;

  return {
    success: true,
    categoria,
    limite_anterior: anterior,
    limite_nuevo: limite,
    mensaje_confirmacion: `✅ Listo, Valentina. Configuré un límite de ${new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0 }).format(limite)} en ${categoria}. Te aviso cuando te acerques al 80%.`,
  };
}

export function getBudgetLimits(): Record<string, number> {
  return { ..._budgetLimits };
}
