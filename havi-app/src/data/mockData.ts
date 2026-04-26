// ============================================================
// MOCK DATA SERVICE
// Simula los outputs/integration/ JSONs y datos de usuario
// ============================================================

import {
  HeyUser,
  UC1Context,
  UC2Context,
  UC3Context,
  UC4Context,
  HaviAlert,
  Transaccion,
} from "../types";

// ---- USUARIOS DE DEMO (Representativos por UC) ---------------
export const DEMO_USERS: HeyUser[] = [
  {
    user_id: "USR-15022",
    nombre: "Valentina",
    apellido: "Morales",
    canal_preferido: "app_android",
    balance_actual: 3043.42,
    ingreso_mensual: 13500,
    zona_riesgo: "Crítico",
    score_riesgo: 1.246,
    tendencia_riesgo: "Empeorando",
    gasto_acumulado_mes: 5970.76,
    gasto_estimado_fin_mes: 12339.57,
    tiene_hey_pro: false,
    avatar_color: "#FF5A1F",
  },
  {
    user_id: "USR-05719",
    nombre: "Sofía",
    apellido: "Ríos",
    canal_preferido: "app_ios",
    balance_actual: 1540.00,
    ingreso_mensual: 51000,
    zona_riesgo: "Saludable",
    score_riesgo: 0.8,
    tendencia_riesgo: "Estable",
    gasto_acumulado_mes: 18000.00,
    gasto_estimado_fin_mes: 35000.00,
    tiene_hey_pro: true,
    avatar_color: "#00d4aa",
  },
  {
    user_id: "USR-03688",
    nombre: "Mariana",
    apellido: "Garza",
    canal_preferido: "app_android",
    balance_actual: 4500.00,
    ingreso_mensual: 9000,
    zona_riesgo: "Precaución",
    score_riesgo: 1.05,
    tendencia_riesgo: "Estable",
    gasto_acumulado_mes: 4000.00,
    gasto_estimado_fin_mes: 8500.00,
    tiene_hey_pro: true,
    avatar_color: "#4f9eff",
  },
  {
    user_id: "USR-07552",
    nombre: "Fernanda",
    apellido: "López",
    canal_preferido: "app_ios",
    balance_actual: 12000.00,
    ingreso_mensual: 43000,
    zona_riesgo: "Saludable",
    score_riesgo: 0.6,
    tendencia_riesgo: "Mejorando",
    gasto_acumulado_mes: 25000.00,
    gasto_estimado_fin_mes: 38000.00,
    tiene_hey_pro: false,
    avatar_color: "#f5a623",
  },
  {
    user_id: "USR-11034",
    nombre: "Camila",
    apellido: "Reyes",
    canal_preferido: "app_android",
    balance_actual: 28000.00,
    ingreso_mensual: 39000,
    zona_riesgo: "Saludable",
    score_riesgo: 0.75,
    tendencia_riesgo: "Estable",
    gasto_acumulado_mes: 12000.00,
    gasto_estimado_fin_mes: 29000.00,
    tiene_hey_pro: false,
    avatar_color: "#ff6b6b",
  }
];

export let DEMO_USER: HeyUser = DEMO_USERS[0];

export function setDemoUser(user: HeyUser) {
  DEMO_USER = user;
}

// ---- UC1 CONTEXT -------------------------------------------
// Rechazo real: TXN-0000802042, $972.39 en supermercado, 2025-06-06
export const UC1_MOCK: UC1Context = {
  user_id: "USR-05719",
  transaccion_id: "TXN-0000802042",
  situacion: "rechazo_por_saldo",
  motivo: "saldo_insuficiente",
  monto_rechazado: 972.39,
  comercio: "Supermercado",
  ciudad_transaccion: "CDMX - Miguel Hidalgo",
  fecha_hora: "2025-06-06 12:50:29",
  es_internacional: false,
  nombre_usuario: "Sofía",
  saldo_actual_producto_origen: 3_043.42,
  monto_faltante: 972.39,
  tiene_alternativo: true,
  producto_alternativo: "tarjeta_credito_hey",
  producto_alternativo_id: "PRD-00000002",
  monto_disponible_alternativo: 15_000.0,
  es_cronico: false,
  canal_preferido: "app_android",
};

// ---- UC2 CONTEXT (solo para Havi, NO mostrar al usuario) ---
// Datos reales USR-15022: zona Crítico, déficit en 7.6 días
export const UC2_MOCK: UC2Context = {
  user_id: "USR-15022",
  nombre_usuario: "Valentina",
  zona_riesgo: "Crítico",
  score_riesgo: 1.246,
  tendencia_riesgo: "Empeorando",
  delta_score_mensual: 0.47,
  gasto_acumulado_mes: 5_970.76,
  gasto_estimado_fin_mes: 12_339.57,
  mensualidades_pendientes: 4_485.82,
  ingreso_mensual: 13_500,
  deficit_proyectado: -3_325.39,
  dias_al_corte: 8,
  categoria_problema: "supermercado",
  comparativa_mes_anterior: {
    gasto_real_mes_anterior: 5_993.65,
    gasto_estimado_fin_mes: 12_339.57,
    variacion_pct: 105.87,
  },
};

// ---- UC3 CONTEXT -------------------------------------------
// Datos reales USR-15022: $59.94/mes cashback, nómina ya domiciliada → 1 paso
export const UC3_MOCK: UC3Context = {
  user_id: "USR-07552",
  nombre_usuario: "Fernanda",
  cashback_perdido_mes: 59.94,
  cashback_anual_estimado: 719.28,
  top_categoria_perdida: "supermercado",
  monto_top_categoria: 5_994.0,
  segmento: "A",
  ya_tiene_nomina: true,
  pasos_activacion: 1,
  requisito_activacion: "Activar Hey Pro (nómina ya domiciliada)",
  score_propension: 0.67,
  dias_desde_ultimo_login: 4,
};

// ---- UC4 CONTEXT -------------------------------------------
// USR-15022: intent histórico soporte_tecnico, 4 turnos conversacionales
// (sin transacción atípica activa — se mantiene el ejemplo de fraude para demo)
export const UC4_MOCK: UC4Context = {
  user_id: "USR-11034",
  transaccion_id: "TXN-003",
  producto_id: "PRD-00000001",
  monto: 2150.00,
  comercio: "Amazon US",
  ciudad_transaccion: "Seattle, WA",
  fecha_hora: "2025-08-24 03:14:00",
  hora_del_dia: 3,
  es_internacional: true,
  es_nocturna: true,
  anomaly_score: 0.92,
  canal_alerta: "app_push",
  sla_respuesta_seg: 300,
};

// ---- TRANSACCIONES -----------------------------------------
export const TRANSACCIONES_MOCK: Transaccion[] = [
  {
    id: "TXN-001",
    descripcion: "Uber Eats",
    comercio: "Uber Eats",
    monto: -285.5,
    tipo: "cargo",
    categoria: "restaurante",
    fecha: "2025-08-24 19:30",
    ciudad: "CDMX",
  },
  {
    id: "TXN-002",
    descripcion: "Nómina Julio",
    comercio: "Empresa S.A.",
    monto: 24_000,
    tipo: "abono",
    categoria: "ingreso",
    fecha: "2025-08-01 09:00",
    ciudad: "CDMX",
  },
  {
    id: "TXN-003",
    descripcion: "Amazon US",
    comercio: "Amazon US",
    monto: -2_150.0,
    tipo: "cargo",
    categoria: "tecnologia",
    fecha: "2025-08-24 03:14",
    es_anomala: true,
    ciudad: "Seattle, WA",
  },
  {
    id: "TXN-004",
    descripcion: "OXXO",
    comercio: "OXXO",
    monto: -145.0,
    tipo: "cargo",
    categoria: "supermercado",
    fecha: "2025-08-23 15:20",
    ciudad: "CDMX",
  },
  {
    id: "TXN-005",
    descripcion: "Netflix",
    comercio: "Netflix",
    monto: -219.0,
    tipo: "cargo",
    categoria: "entretenimiento",
    fecha: "2025-08-20 00:00",
    ciudad: "CDMX",
  },
  {
    id: "TXN-006",
    descripcion: "Walmart Superama",
    comercio: "Walmart",
    monto: -1_240.0,
    tipo: "cargo",
    categoria: "supermercado",
    fecha: "2025-08-19 11:45",
    ciudad: "CDMX",
  },
  {
    id: "TXN-007",
    descripcion: "CDMX Metro",
    comercio: "Metro CDMX",
    monto: -28.0,
    tipo: "cargo",
    categoria: "transporte",
    fecha: "2025-08-18 08:10",
    ciudad: "CDMX",
  },
  {
    id: "TXN-008",
    descripcion: "Spotify Premium",
    comercio: "Spotify",
    monto: -99.0,
    tipo: "cargo",
    categoria: "entretenimiento",
    fecha: "2025-08-15 00:00",
    ciudad: "CDMX",
  },
];

// ---- ALERTAS ACTIVAS (mix UC1+UC3+UC4) ---------------------
export const ALERTAS_MOCK: HaviAlert[] = [
  {
    id: "ALT-001",
    type: "txn_atipica",
    priority: "alta",
    titulo: "Cargo inusual detectado",
    mensaje:
      "Detecté un cargo de $2,150 en Amazon US, Seattle WA a las 3 AM. Parece inusual. ¿Lo reconoces?",
    timestamp: "2025-08-24T03:14:00",
    leida: false,
    accionada: false,
    uc4_context: UC4_MOCK,
    accion_primaria: { label: "Sí, era yo", type: "approve" },
    accion_secundaria: { label: "Bloquear tarjeta", type: "block" },
  },
  {
    id: "ALT-002",
    type: "rechazo_saldo",
    priority: "alta",
    titulo: "Cargo rechazado",
    mensaje:
      "Tu pago de **$349** en NewsDigital MX fue rechazado por saldo insuficiente. Tienes **$88,790** en tu crédito Hey. ¿Quieres intentarlo con esa?",
    timestamp: "2025-08-23T20:37:31",
    leida: false,
    accionada: false,
    uc1_context: UC1_MOCK,
    accion_primaria: { label: "Usar crédito Hey", type: "transfer" },
    accion_secundaria: { label: "No, gracias", type: "dismiss" },
  },
  {
    id: "ALT-003",
    type: "cashback_proximo_perdido",
    priority: "media",
    titulo: "Estás perdiendo cashback",
    mensaje:
      "Con tus compras este mes habrías ganado $387.50 MXN en cashback con Hey Pro. Al año son $4,650.",
    timestamp: "2025-08-22T10:00:00",
    leida: true,
    accionada: false,
    uc3_context: UC3_MOCK,
    accion_primaria: { label: "Ver Hey Pro", type: "activate_pro" },
    accion_secundaria: { label: "Hablar con Havi", type: "chat" },
  },
];

// ---- HELPERS -----------------------------------------------
export function formatMXN(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(Math.abs(amount));
}

export function getZonaColor(zona: string): string {
  if (zona === "Saludable") return "#00C896";
  if (zona === "Precaucion" || zona === "Precaución") return "#FFB800";
  return "#FF4B4B";
}

export function getZonaLabel(zona: string): string {
  if (zona === "Saludable") return "Saludable";
  if (zona === "Precaucion" || zona === "Precaución") return "Precaución";
  return "Crítico";
}

export function getAlertIcon(type: string): string {
  const icons: Record<string, string> = {
    txn_atipica: "shield-alert",
    rechazo_saldo: "credit-card-off",
    rechazo_limite: "credit-card-off",
    cashback_proximo_perdido: "star",
    liquidez_proxima: "trending-down",
    upselling_pro: "zap",
    disputa_abierta: "alert-triangle",
  };
  return icons[type] || "bell";
}

export function timeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (diff < 60) return "Hace un momento";
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
  return `Hace ${Math.floor(diff / 86400)} días`;
}
