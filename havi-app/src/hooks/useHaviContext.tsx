// ============================================================
// HAVI CONTEXT PROVIDER
// Fetches full UC1-UC4 context from pipeline on mount.
// Maps pipeline types → app types, falls back to mock data
// when the pipeline is unavailable (offline / not started).
// ============================================================

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

import {
  pipelineClient,
  PipelineFullContext,
  PipelineAlert,
  PipelineRecommendation,
} from "../services/apiClient";
import {
  HaviAlert,
  UC2Context,
  UC3Context,
  ZonaRiesgo,
  TendenciaRiesgo,
} from "../types";
import { DEMO_USER, UC2_MOCK, UC3_MOCK } from "../data/mockData";

// ── Context shape ────────────────────────────────────────────

export interface HaviContextData {
  isLoading: boolean;
  isConnected: boolean;
  userId: string;
  userName: string;
  ingreso_mensual: number;
  tiene_hey_pro: boolean;
  uc2: UC2Context;
  uc3: UC3Context | null;
  /** Alerts derived from UC1 + UC4 pipeline data */
  pipelineAlerts: HaviAlert[];
  refetch: () => void;
}

const HaviCtx = createContext<HaviContextData | null>(null);

// ── Mapping helpers ──────────────────────────────────────────

function mapAlertType(raw: string): HaviAlert["type"] {
  if (raw.includes("atipica") || raw.includes("fraude") || raw === "transaccion_atipica")
    return "txn_atipica";
  if (raw.includes("saldo")) return "rechazo_saldo";
  if (raw.includes("limite")) return "rechazo_limite";
  if (raw.includes("cashback") || raw.includes("pro")) return "cashback_proximo_perdido";
  if (raw.includes("liquidez")) return "liquidez_proxima";
  return "txn_atipica";
}

function mapPipelineAlertsToHaviAlerts(raw: PipelineAlert[]): HaviAlert[] {
  return raw.map((a, i) => {
    const type = mapAlertType(a.alert_type);
    const priority: "alta" | "media" | "baja" =
      a.priority === "critica" || a.priority === "alta"
        ? "alta"
        : a.priority === "media"
        ? "media"
        : "baja";

    const ctx = a.context;
    const monto: number = ctx.monto ?? 0;
    const motivo: string = ctx.motivo ?? a.alert_type;
    const comercio: string = ctx.comercio ?? ctx.categoria ?? "";
    const fechaHora: string = ctx.fecha_hora
      ? new Date(ctx.fecha_hora).toISOString()
      : new Date().toISOString();

    let titulo = "Alerta de cuenta";
    let mensaje = "";
    let accion_primaria: HaviAlert["accion_primaria"];
    let accion_secundaria: HaviAlert["accion_secundaria"];

    if (type === "txn_atipica") {
      titulo = a.iso_is_anomaly ? "Transacción sospechosa detectada" : "Cargo inusual detectado";
      const ubicacion = ctx.es_internacional ? " (cargo internacional)" : "";
      const hora = ctx.es_nocturna ? " a las 3 AM" : "";
      mensaje = `Detecté un cargo de **$${monto.toLocaleString("es-MX")}** en ${comercio}${ubicacion}${hora}. ¿Lo reconoces?`;
      accion_primaria = { label: "Sí, era yo", type: "approve" };
      accion_secundaria = { label: "Bloquear tarjeta", type: "block" };
    } else if (type === "rechazo_saldo") {
      titulo = "Cargo rechazado";
      const saldoAlt: number = ctx.saldo_inversion_disponible ?? 0;
      mensaje =
        `Tu pago de **$${monto.toLocaleString("es-MX")}** fue rechazado por saldo insuficiente.` +
        (saldoAlt > 0
          ? ` Tienes **$${saldoAlt.toLocaleString("es-MX")}** en inversión disponible.`
          : "");
      accion_primaria = { label: "Mover fondos", type: "transfer" };
      accion_secundaria = { label: "Hablar con Havi", type: "chat" };
    } else if (type === "rechazo_limite") {
      titulo = "Límite excedido";
      mensaje = `Tu cargo de **$${monto.toLocaleString("es-MX")}** en ${comercio} fue rechazado por límite de crédito.`;
      accion_primaria = { label: "Ver opciones", type: "chat" };
      accion_secundaria = { label: "No, gracias", type: "dismiss" };
    } else {
      titulo = `Alerta: ${a.alert_type.replace(/_/g, " ")}`;
      mensaje = `Cargo de $${monto.toLocaleString("es-MX")} en ${comercio}.`;
      accion_primaria = { label: "Ver detalles", type: "chat" };
    }

    return {
      id: `pipeline-uc1-${i}-${ctx.transaccion_id ?? Date.now()}`,
      type,
      priority,
      titulo,
      mensaje,
      timestamp: fechaHora,
      leida: false,
      accionada: false,
      accion_primaria,
      accion_secundaria,
      uc1_context: type.includes("rechazo") ? {
        user_id: "",
        transaccion_id: ctx.transaccion_id ?? "",
        situacion: type as any,
        motivo: ctx.motivo as any,
        monto_rechazado: monto,
        comercio: comercio,
        ciudad_transaccion: "",
        fecha_hora: fechaHora,
        es_internacional: false,
        nombre_usuario: "",
        saldo_actual_producto_origen: 0,
        monto_faltante: 0,
        tiene_alternativo: !!ctx.producto_alternativo,
        producto_alternativo: ctx.producto_alternativo ?? null,
        producto_alternativo_id: null,
        monto_disponible_alternativo: ctx.saldo_inversion_disponible ?? null,
        es_cronico: false,
        canal_preferido: ""
      } : undefined,
      uc4_context: type === "txn_atipica" ? {
        user_id: "",
        transaccion_id: ctx.transaccion_id ?? "",
        producto_id: "",
        monto: monto,
        comercio: comercio,
        ciudad_transaccion: "",
        fecha_hora: fechaHora,
        hora_del_dia: 0,
        es_internacional: !!ctx.es_internacional,
        es_nocturna: !!ctx.es_nocturna,
        anomaly_score: 0,
        canal_alerta: "chat",
        sla_respuesta_seg: 0
      } : undefined,
    };
  });
}

function mapUC2(pipeline: PipelineFullContext): UC2Context {
  const profile = pipeline.havi_context.user_profile;
  const m = pipeline.havi_context.uc2.metrics;

  const zona: ZonaRiesgo = (m.zona_riesgo as ZonaRiesgo) ?? UC2_MOCK.zona_riesgo;
  const tendencia: TendenciaRiesgo =
    (m.tendencia_riesgo as TendenciaRiesgo) ?? UC2_MOCK.tendencia_riesgo;
  const ingreso = profile.ingreso_mensual_mxn || UC2_MOCK.ingreso_mensual;
  const gastoAcumulado = m.gasto_total ?? UC2_MOCK.gasto_acumulado_mes;

  // dias_hasta_deficit: null means "no deficit risk"
  const diasCorte: number =
    m.dias_hasta_deficit != null && typeof m.dias_hasta_deficit === "number"
      ? Math.max(0, Math.min(30, Math.round(m.dias_hasta_deficit)))
      : UC2_MOCK.dias_al_corte;

  // ingreso_restante_estimado < 0 means projected deficit
  const deficit: number =
    m.ingreso_restante_estimado != null
      ? m.ingreso_restante_estimado
      : UC2_MOCK.deficit_proyectado;

  return {
    user_id: pipeline.user_id,
    nombre_usuario: DEMO_USER.nombre,
    zona_riesgo: zona,
    score_riesgo: UC2_MOCK.score_riesgo,
    tendencia_riesgo: tendencia,
    delta_score_mensual: UC2_MOCK.delta_score_mensual,
    gasto_acumulado_mes: gastoAcumulado,
    gasto_estimado_fin_mes: gastoAcumulado * 1.3, // rough projection
    mensualidades_pendientes: UC2_MOCK.mensualidades_pendientes,
    ingreso_mensual: ingreso,
    deficit_proyectado: deficit,
    dias_al_corte: diasCorte,
    categoria_problema: m.top_categoria || UC2_MOCK.categoria_problema,
    comparativa_mes_anterior: UC2_MOCK.comparativa_mes_anterior,
  };
}

function mapUC3(pipeline: PipelineFullContext): UC3Context | null {
  const recs = pipeline.havi_context.uc3.recommendations;
  if (!recs.length) return null;

  const top: PipelineRecommendation = recs[0];
  const cashback = top.cashback_perdido_mes ?? 0;

  return {
    user_id: pipeline.user_id,
    nombre_usuario: DEMO_USER.nombre,
    cashback_perdido_mes: cashback,
    cashback_anual_estimado: cashback * 12,
    top_categoria_perdida:
      pipeline.havi_context.uc2.metrics.top_categoria || UC3_MOCK.top_categoria_perdida,
    monto_top_categoria: UC3_MOCK.monto_top_categoria,
    segmento: UC3_MOCK.segmento,
    ya_tiene_nomina: false,
    pasos_activacion: 3,
    requisito_activacion: top.reason || UC3_MOCK.requisito_activacion,
    score_propension: top.score,
    dias_desde_ultimo_login: UC3_MOCK.dias_desde_ultimo_login,
  };
}

function buildCashbackAlert(
  userId: string,
  uc3: UC3Context,
  tieneHeyPro: boolean
): HaviAlert | null {
  if (tieneHeyPro || uc3.cashback_perdido_mes <= 0) return null;
  return {
    id: `pipeline-cashback-${userId}-${Date.now()}`,
    type: "cashback_proximo_perdido",
    priority: "media",
    titulo: "Estás perdiendo cashback",
    mensaje: `Con tus compras este mes habrías ganado **$${uc3.cashback_perdido_mes.toFixed(2)}** con Hey Pro. Al año son **$${(uc3.cashback_perdido_mes * 12).toFixed(2)}**.`,
    timestamp: new Date().toISOString(),
    leida: false,
    accionada: false,
    uc3_context: uc3,
    accion_primaria: { label: "Ver Hey Pro", type: "activate_pro" },
    accion_secundaria: { label: "Hablar con Havi", type: "chat" },
  };
}

function buildFraudAlert(userId: string, uc4: PipelineFullContext["havi_context"]["uc4"]): HaviAlert | null {
  if (!uc4.alerta_fraude_alta && !uc4.iso_txn_is_anomaly) return null;
  return {
    id: `pipeline-fraud-${userId}-${Date.now()}`,
    type: "txn_atipica",
    priority: "alta",
    titulo: "Transacción sospechosa",
    mensaje:
      uc4.alerta_fraude_alta
        ? "Hay una transacción que parece inusual **y** mencionaste que no la reconoces. Havi sugiere bloquear preventivamente."
        : "Detecté una transacción atípica en tu cuenta. ¿La reconoces?",
    timestamp: new Date().toISOString(),
    leida: false,
    accionada: false,
    accion_primaria: { label: "Sí, era yo", type: "approve" },
    accion_secundaria: { label: "Bloquear tarjeta", type: "block" },
  };
}

// ── Provider ─────────────────────────────────────────────────

export function HaviContextProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [uc2, setUC2] = useState<UC2Context>(UC2_MOCK);
  const [uc3, setUC3] = useState<UC3Context | null>(UC3_MOCK);
  const [pipelineAlerts, setPipelineAlerts] = useState<HaviAlert[]>([]);
  const [ingreso_mensual, setIngresoMensual] = useState(DEMO_USER.ingreso_mensual);
  const [tiene_hey_pro, setTieneHeyPro] = useState(DEMO_USER.tiene_hey_pro);

  const userId = DEMO_USER.user_id;
  const userName = DEMO_USER.nombre;

  const fetchContext = useCallback(async () => {
    setIsLoading(true);
    try {
      const healthy = await pipelineClient.health();
      if (!healthy) {
        setIsConnected(false);
        setIsLoading(false);
        return;
      }

      const data = await pipelineClient.getFullContext(userId);
      setIsConnected(true);

      const profile = data.havi_context.user_profile;
      const tieneHeyPro = profile.es_hey_pro;
      setTieneHeyPro(tieneHeyPro);
      if (profile.ingreso_mensual_mxn) setIngresoMensual(profile.ingreso_mensual_mxn);

      const mappedUC2 = mapUC2(data);
      const mappedUC3 = mapUC3(data);
      setUC2(mappedUC2);
      setUC3(mappedUC3);

      // Aggregate all pipeline-sourced alerts
      const uc1Alerts = mapPipelineAlertsToHaviAlerts(data.havi_context.uc1.alerts);
      const fraudAlert = buildFraudAlert(userId, data.havi_context.uc4);
      const cashbackAlert = mappedUC3 ? buildCashbackAlert(userId, mappedUC3, tieneHeyPro) : null;

      const allAlerts: HaviAlert[] = [
        ...uc1Alerts,
        ...(fraudAlert ? [fraudAlert] : []),
        ...(cashbackAlert ? [cashbackAlert] : []),
      ];

      // Only replace with pipeline alerts if we got any; otherwise keep mocks visible
      if (allAlerts.length > 0) {
        setPipelineAlerts(allAlerts);
      }
    } catch (e) {
      console.warn("[HaviContext] Pipeline unavailable, falling back to mock data:", e);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchContext();
  }, [fetchContext]);

  return (
    <HaviCtx.Provider
      value={{
        isLoading,
        isConnected,
        userId,
        userName,
        ingreso_mensual,
        tiene_hey_pro,
        uc2,
        uc3,
        pipelineAlerts,
        refetch: fetchContext,
      }}
    >
      {children}
    </HaviCtx.Provider>
  );
}

export function useHaviContext(): HaviContextData {
  const ctx = useContext(HaviCtx);
  if (!ctx) throw new Error("useHaviContext must be used inside HaviContextProvider");
  return ctx;
}
