// ============================================================
// TIPOS TYPESCRIPT — Havi App
// Basados en los schemas reales de outputs/integration/
// ============================================================

// ---- USUARIO -----------------------------------------------
export interface HeyUser {
  user_id: string;
  nombre: string;
  apellido: string;
  canal_preferido: string;
  balance_actual: number;
  ingreso_mensual: number;
  zona_riesgo: ZonaRiesgo;
  score_riesgo: number;
  tendencia_riesgo: TendenciaRiesgo;
  gasto_acumulado_mes: number;
  gasto_estimado_fin_mes: number;
  tiene_hey_pro: boolean;
  avatar_color: string;
}

// ---- ENUMS -------------------------------------------------
export type ZonaRiesgo = "Saludable" | "Precaucion" | "Precaución" | "Crítico" | "Critica";
export type TendenciaRiesgo = "Mejorando" | "Estable" | "Empeorando";
export type AlertType =
  | "rechazo_saldo"
  | "rechazo_limite"
  | "txn_atipica"
  | "liquidez_proxima"
  | "cashback_proximo_perdido"
  | "disputa_abierta"
  | "upselling_pro";

export type AlertPriority = "alta" | "media" | "baja";

// ---- UC1: RECHAZO / ALERTA PROACTIVA ----------------------
export interface UC1Context {
  user_id: string;
  transaccion_id: string;
  situacion: "rechazo_por_saldo" | "rechazo_por_limite";
  motivo: "saldo_insuficiente" | "limite_excedido";
  monto_rechazado: number;
  comercio: string;
  ciudad_transaccion: string;
  fecha_hora: string;
  es_internacional: boolean;
  nombre_usuario: string;
  saldo_actual_producto_origen: number;
  monto_faltante: number;
  tiene_alternativo: boolean;
  producto_alternativo: string | null;
  producto_alternativo_id: string | null;
  monto_disponible_alternativo: number | null;
  es_cronico: boolean;
  canal_preferido: string;
}

export interface TransferFundsParams {
  from_producto_id: string;
  to_producto_id: string;
  monto: number;
  user_id: string;
}

export interface TransferFundsResult {
  success: boolean;
  transfer_id?: string;
  monto_transferido?: number;
  nuevo_estatus_txn?: string;
  message: string;
  error_code?: string;
}

// ---- UC2: GEMELO DIGITAL (solo para contexto Havi) --------
export interface UC2Context {
  user_id: string;
  nombre_usuario: string;
  zona_riesgo: ZonaRiesgo;
  score_riesgo: number;
  tendencia_riesgo: TendenciaRiesgo;
  delta_score_mensual: number;
  gasto_acumulado_mes: number;
  gasto_estimado_fin_mes: number;
  mensualidades_pendientes: number;
  ingreso_mensual: number;
  deficit_proyectado: number;
  dias_al_corte: number;
  categoria_problema: string;
  comparativa_mes_anterior: {
    gasto_real_mes_anterior: number;
    gasto_estimado_fin_mes: number;
    variacion_pct?: number;
  };
}

export interface SetBudgetParams {
  user_id: string;
  categoria: string;
  limite_mxn: number;
}

// ---- UC3: UPSELLING HEY PRO --------------------------------
export interface UC3Context {
  user_id: string;
  nombre_usuario: string;
  cashback_perdido_mes: number;
  cashback_anual_estimado: number;
  top_categoria_perdida: string;
  monto_top_categoria: number;
  segmento: "A" | "B" | "C";
  ya_tiene_nomina: boolean;
  pasos_activacion: 1 | 3;
  requisito_activacion: string;
  score_propension: number;
  dias_desde_ultimo_login: number;
}

// ---- UC4: ANOMALÍA / SEGURIDAD -----------------------------
export interface UC4Context {
  user_id: string;
  transaccion_id: string;
  producto_id: string;
  monto: number;
  comercio: string;
  ciudad_transaccion: string;
  fecha_hora: string;
  hora_del_dia: number;
  es_internacional: boolean;
  es_nocturna: boolean;
  anomaly_score: number;
  canal_alerta: "chat" | "voz";
  sla_respuesta_seg: number;
}

export type UserResponseClassification = "si_fui_yo" | "no_fui_yo" | "sin_respuesta";

export interface BlockCardResult {
  success: boolean;
  txn_id: string;
  producto_id: string;
  estatus_txn: string;
  estatus_producto: string;
  disputa_id: string;
  entrega_nueva_tarjeta_dias: number;
  message: string;
}

// ---- ALERTAS (sistema unificado) ---------------------------
export interface HaviAlert {
  id: string;
  type: AlertType;
  priority: AlertPriority;
  titulo: string;
  mensaje: string;
  timestamp: string;
  leida: boolean;
  accionada: boolean;
  // Payload según UC
  uc1_context?: UC1Context;
  uc3_context?: UC3Context;
  uc4_context?: UC4Context;
  // Acción rápida
  accion_primaria?: {
    label: string;
    type: "transfer" | "approve" | "block" | "activate_pro" | "chat";
  };
  accion_secundaria?: {
    label: string;
    type: "chat" | "dismiss" | "block";
  };
}

// ---- CHAT --------------------------------------------------
export type MessageRole = "user" | "havi" | "system";
export type MessageStatus = "sending" | "sent" | "error";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  status?: MessageStatus;
  // Mensaje especial con acción embed
  embedded_alert?: HaviAlert;
  // Pills de sugerencia post-mensaje
  suggestions?: string[];
}

export interface SuggestionPill {
  id: string;
  label: string;
  prompt: string;
  icon?: string;
}

// ---- TRANSACCIONES (display) -------------------------------
export interface Transaccion {
  id: string;
  descripcion: string;
  comercio: string;
  monto: number;
  tipo: "cargo" | "abono";
  categoria: string;
  fecha: string;
  es_anomala?: boolean;
  ciudad?: string;
}
