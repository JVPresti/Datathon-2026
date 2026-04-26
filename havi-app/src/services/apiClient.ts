// ============================================================
// PIPELINE API CLIENT
// Connects havi-app to the FastAPI pipeline (UC1-UC4 + Gemini)
//
// URL resolution order:
//   1. EXPO_PUBLIC_API_URL env var  (set in .env.local for tunnel/device mode)
//   2. Constants.expoConfig.hostUri (auto-detects dev machine IP in LAN mode)
//   3. Platform fallbacks            (Android emulator = 10.0.2.2, else localhost)
// ============================================================

import { Platform } from "react-native";
import Constants from "expo-constants";

function getBaseUrl(): string {
  // 1. Explicit env var — most reliable for Expo tunnel + physical device
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");

  if (__DEV__) {
    // 2. Derive from Expo's host URI (works for LAN mode: "192.168.x.x:8081")
    //    Skip tunnel/cloud URLs (exp.host, exp.direct, ngrok, etc.)
    const hostUri = Constants.expoConfig?.hostUri ?? "";
    const isTunnel =
      hostUri.includes("exp.host") ||
      hostUri.includes("exp.direct") ||
      hostUri.includes("ngrok") ||
      hostUri.includes("tunnel");
    if (hostUri && !isTunnel) {
      const host = hostUri.split(":")[0];
      if (host && host !== "localhost" && host !== "127.0.0.1") {
        return `http://${host}:8000`;
      }
    }

    // 3. Platform-specific fallback (emulators & local web)
    if (Platform.OS === "android") return "http://10.0.2.2:8000";
    return "http://localhost:8000";
  }

  return "http://localhost:8000";
}

export const API_BASE_URL = getBaseUrl();

// Log resolved URL once at bundle init so developers can verify in the console
console.info(`[Pipeline] API_BASE_URL = ${API_BASE_URL}`);

// Gemini server-side can take 15-30s with large context; be generous
const HEALTH_TIMEOUT_MS = 8_000;
const CONTEXT_TIMEOUT_MS = 20_000;
const CHAT_TIMEOUT_MS = 90_000;

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ── Pipeline response types ──────────────────────────────────

export interface PipelineAlert {
  alert_type: string;
  priority: string;
  context: Record<string, any>;
  iso_anomaly_score: number | null;
  iso_is_anomaly: boolean;
}

export interface PipelineUC2Metrics {
  n_tx_30d: number;
  n_tx_90d: number;
  gasto_total: number;
  ticket_avg: number;
  top_categoria: string;
  score_buro: number;
  n_productos_activos: number;
  weekend_ratio: number;
  zona_riesgo?: string;
  dias_hasta_deficit?: number | null;
  ingreso_restante_estimado?: number;
  tendencia_riesgo?: string;
  ml_prob_deficit?: number;
  ml_alerta_liquidez?: boolean;
  ml_nivel_riesgo?: string;
  ml_ingreso_comprometido_pct?: number;
}

export interface PipelineRecommendation {
  producto: string;
  score: number;
  reason: string;
  cashback_perdido_mes: number;
}

export interface PipelineFullContext {
  user_id: string;
  havi_context: {
    user_profile: {
      es_hey_pro: boolean;
      edad: number;
      estado: string;
      ingreso_mensual_mxn: number;
      satisfaccion_1_10: number;
      preferencia_canal: string;
      n_rechazos_30d: number;
      n_disputas: number;
      es_cronico_rechazos: boolean;
      productos_activos: Array<{ tipo: string; saldo: number }>;
    };
    uc1: { alerts: PipelineAlert[] };
    uc2: {
      persona: string;
      key_traits: string[];
      metrics: PipelineUC2Metrics;
    };
    uc3: { recommendations: PipelineRecommendation[] };
    uc4: {
      recent_turns: Array<{ role: string; content: string; ts: string }>;
      intent_top: string;
      menciona_fraude: boolean;
      menciona_cashback: boolean;
      menciona_credito: boolean;
      menciona_inversion: boolean;
      iso_txn_anomaly_score: number | null;
      iso_txn_is_anomaly: boolean;
      alerta_fraude_alta: boolean;
    };
  };
  assembled_at: string;
}

export interface PipelineChatAction {
  label: string;
  action_id: string;
  payload?: Record<string, any>;
}

export interface PipelineChatResponse {
  response: string;
  actions: PipelineChatAction[];
  context_used: Record<string, any>;
}

// ── API methods ──────────────────────────────────────────────

export const pipelineClient = {
  async health(): Promise<boolean> {
    try {
      const res = await fetchWithTimeout(
        `${API_BASE_URL}/health`,
        { method: "GET" },
        HEALTH_TIMEOUT_MS
      );
      return res.ok;
    } catch {
      return false;
    }
  },

  async getFullContext(userId: string): Promise<PipelineFullContext> {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/context/full/${encodeURIComponent(userId)}`,
      { method: "GET", headers: { Accept: "application/json", "Bypass-Tunnel-Reminder": "true" } },
      CONTEXT_TIMEOUT_MS
    );
    if (!res.ok) {
      throw new Error(`Context fetch failed: ${res.status} ${res.statusText}`);
    }
    return res.json();
  },

  async sendChat(userId: string, message: string): Promise<PipelineChatResponse> {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/chat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Bypass-Tunnel-Reminder": "true",
        },
        body: JSON.stringify({ user_id: userId, message }),
      },
      CHAT_TIMEOUT_MS
    );
    if (!res.ok) {
      throw new Error(`Chat request failed: ${res.status} ${res.statusText}`);
    }
    return res.json();
  },
};
