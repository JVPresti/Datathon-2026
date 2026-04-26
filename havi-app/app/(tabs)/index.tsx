// ============================================================
// HOME — Dashboard principal — Obsidian Intelligence dark mode
// Filosofía: solo datos críticos, jerarquía clara, HAVI proactivo
// ============================================================

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAlerts } from "../../src/hooks/useAlerts";
import {
  DEMO_USER,
  TRANSACCIONES_MOCK,
  UC3_MOCK,
  formatMXN,
  timeAgo,
} from "../../src/data/mockData";
import {
  shouldFireUC3,
  markUC3Fired,
  generarContextoUC3,
  generarMensajeProactivoUC3,
} from "../../src/services/upsellingService";
import { executePayrollPortability } from "../../src/services/haviService";

const D = {
  bg: "#07090E",
  surface: "#0F1318",
  card: "#161B27",
  cardAlt: "#1C2235",
  border: "rgba(255,255,255,0.07)",
  borderAccent: "rgba(6,182,212,0.2)",
  text: "#EFF6FF",
  textSub: "rgba(239,246,255,0.55)",
  textMuted: "rgba(239,246,255,0.30)",
  accent: "#06B6D4",
  accentDeep: "#0891B2",
  accentGlow: "rgba(6,182,212,0.12)",
  success: "#4ADE80",
  warning: "#FBBF24",
  error: "#F87171",
};

const CATEGORIA_ICONS: Record<string, string> = {
  restaurante: "🍽️",
  supermercado: "🛒",
  transporte: "🚌",
  entretenimiento: "🎬",
  tecnologia: "💻",
  ingreso: "💰",
  default: "💳",
};

export default function HomeScreen() {
  const router = useRouter();
  const { alerts, showAlert, unreadCount } = useAlerts();
  const user = DEMO_USER;
  const [showBalance, setShowBalance] = useState(true);
  const [showUC3, setShowUC3] = useState(false);
  const [uc3Payload, setUC3Payload] = useState<{ text: string; suggestions: string[] } | null>(null);
  const [uc3Done, setUC3Done] = useState(false);

  const lastTxns = TRANSACCIONES_MOCK.slice(0, 4);
  const spendPct = Math.min((user.gasto_acumulado_mes / user.ingreso_mensual) * 100, 100);

  useEffect(() => {
    const urgente = alerts.find((a) => !a.leida && a.priority === "alta");
    if (urgente) {
      const t = setTimeout(() => showAlert(urgente), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (shouldFireUC3()) {
        markUC3Fired();
        const ctx = generarContextoUC3(TRANSACCIONES_MOCK);
        const msg = generarMensajeProactivoUC3(ctx);
        setUC3Payload(msg);
        setShowUC3(true);
      }
    }, 2200);
    return () => clearTimeout(t);
  }, []);

  const handleUC3Accept = () => {
    executePayrollPortability();
    setShowUC3(false);
    setUC3Done(true);
  };

  const urgentAlert = alerts.find((a) => !a.leida && a.priority === "alta");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: D.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 20,
        }}>
          <View>
            <Text style={{ color: D.textMuted, fontSize: 12, letterSpacing: 0.5 }}>
              {getGreeting()}
            </Text>
            <Text style={{ color: D.text, fontSize: 22, fontWeight: "700", marginTop: 2 }}>
              {user.nombre} 👋
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/(tabs)/alerts")}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: pressed ? D.cardAlt : D.card,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: D.border,
            })}
          >
            <Ionicons name="notifications-outline" size={19} color={D.textSub} />
            {unreadCount > 0 && (
              <View style={{
                position: "absolute",
                top: 8,
                right: 8,
                width: 7,
                height: 7,
                borderRadius: 3.5,
                backgroundColor: D.error,
              }} />
            )}
          </Pressable>
        </View>

        {/* ── Balance Hero Card ── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <LinearGradient
            colors={["#121C2E", "#0D1520"]}
            style={{
              borderRadius: 24,
              padding: 24,
              borderWidth: 1,
              borderColor: D.borderAccent,
              overflow: "hidden",
            }}
          >
            {/* Glow top-right */}
            <View style={{
              position: "absolute",
              top: -40,
              right: -20,
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: "rgba(6,182,212,0.08)",
            }} />

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={{ color: D.textMuted, fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase" }}>
                Saldo disponible
              </Text>
              <Pressable onPress={() => setShowBalance(!showBalance)}>
                <Ionicons
                  name={showBalance ? "eye-outline" : "eye-off-outline"}
                  size={16}
                  color={D.textMuted}
                />
              </Pressable>
            </View>

            <Text style={{
              color: D.text,
              fontSize: 40,
              fontWeight: "800",
              letterSpacing: -1,
              marginBottom: 20,
            }}>
              {showBalance ? formatMXN(user.balance_actual) : "••••••"}
            </Text>

            {/* Income / Expense row */}
            <View style={{
              flexDirection: "row",
              gap: 20,
              paddingTop: 16,
              borderTopWidth: 1,
              borderTopColor: "rgba(255,255,255,0.06)",
            }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <View style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: "rgba(74,222,128,0.15)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <Ionicons name="arrow-down" size={11} color={D.success} />
                  </View>
                  <Text style={{ color: D.textMuted, fontSize: 11 }}>Ingresos</Text>
                </View>
                <Text style={{ color: D.success, fontSize: 16, fontWeight: "700" }}>
                  {showBalance ? formatMXN(user.ingreso_mensual) : "••••"}
                </Text>
              </View>
              <View style={{ width: 1, backgroundColor: "rgba(255,255,255,0.06)" }} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <View style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: "rgba(248,113,113,0.12)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <Ionicons name="arrow-up" size={11} color={D.error} />
                  </View>
                  <Text style={{ color: D.textMuted, fontSize: 11 }}>Gastos</Text>
                </View>
                <Text style={{ color: D.text, fontSize: 16, fontWeight: "700" }}>
                  {showBalance ? formatMXN(user.gasto_acumulado_mes) : "••••"}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* ── Alerta urgente inline ── */}
        {urgentAlert && (
          <Pressable
            onPress={() => { showAlert(urgentAlert); }}
            style={({ pressed }) => ({
              marginHorizontal: 20,
              marginBottom: 20,
              padding: 14,
              backgroundColor: pressed ? "rgba(248,113,113,0.10)" : "rgba(248,113,113,0.07)",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "rgba(248,113,113,0.18)",
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            })}
          >
            <View style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              backgroundColor: "rgba(248,113,113,0.12)",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <Ionicons name="warning" size={16} color={D.error} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: D.text, fontSize: 13, fontWeight: "600" }} numberOfLines={1}>
                {urgentAlert.titulo}
              </Text>
              <Text style={{ color: D.textSub, fontSize: 12, marginTop: 1 }} numberOfLines={1}>
                {urgentAlert.mensaje}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={D.textMuted} />
          </Pressable>
        )}

        {/* ── HAVI Proactive Banner (UC3) ── */}
        {showUC3 && uc3Payload && (
          <View style={{
            marginHorizontal: 20,
            marginBottom: 20,
            padding: 16,
            backgroundColor: D.card,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: D.borderAccent,
          }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
              <LinearGradient
                colors={["#06B6D4", "#818CF8"]}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Text style={{ fontSize: 12 }}>✦</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={{ color: D.accent, fontSize: 10, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
                  Havi · Sugerencia
                </Text>
                <Text style={{ color: D.text, fontSize: 13, lineHeight: 19 }}>
                  {uc3Payload.text}
                </Text>
              </View>
              <Pressable onPress={() => setShowUC3(false)}>
                <Ionicons name="close" size={16} color={D.textMuted} />
              </Pressable>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={handleUC3Accept}
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor: pressed ? D.accentDeep : D.accent,
                  borderRadius: 12,
                  paddingVertical: 10,
                  alignItems: "center",
                })}
              >
                <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>Activar</Text>
              </Pressable>
              <Pressable
                onPress={() => setShowUC3(false)}
                style={({ pressed }) => ({
                  paddingHorizontal: 16,
                  backgroundColor: pressed ? D.cardAlt : D.surface,
                  borderRadius: 12,
                  paddingVertical: 10,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: D.border,
                })}
              >
                <Text style={{ color: D.textSub, fontSize: 13 }}>Ahora no</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ── UC3 done toast ── */}
        {uc3Done && (
          <View style={{
            marginHorizontal: 20,
            marginBottom: 20,
            padding: 14,
            backgroundColor: "rgba(74,222,128,0.08)",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "rgba(74,222,128,0.18)",
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}>
            <Ionicons name="checkmark-circle" size={20} color={D.success} />
            <Text style={{ color: D.success, fontSize: 13, fontWeight: "600", flex: 1 }}>
              ¡Solicitud enviada! Havi la procesará pronto.
            </Text>
          </View>
        )}

        {/* ── Quick Actions ── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {QUICK_ACTIONS.map((a) => (
              <QuickAction
                key={a.id}
                icon={a.icon}
                label={a.label}
                accent={a.accent}
                onPress={() => {
                  if (a.id === "havi") router.push("/(tabs)/chat");
                  else if (a.id === "alertas") router.push("/(tabs)/alerts");
                  else if (a.id === "movimientos") router.push("/(tabs)/movements");
                }}
              />
            ))}
          </View>
        </View>

        {/* ── Últimos movimientos ── */}
        <View style={{ paddingHorizontal: 20 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <Text style={{ color: D.text, fontSize: 16, fontWeight: "700" }}>
              Últimos movimientos
            </Text>
            <Pressable onPress={() => router.push("/(tabs)/movements")}>
              <Text style={{ color: D.accent, fontSize: 13, fontWeight: "600" }}>Ver todos</Text>
            </Pressable>
          </View>

          <View style={{
            backgroundColor: D.card,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: D.border,
            overflow: "hidden",
          }}>
            {lastTxns.map((txn, idx) => {
              const icon = CATEGORIA_ICONS[txn.categoria] ?? CATEGORIA_ICONS.default;
              const isIncome = txn.tipo === "abono";
              return (
                <View
                  key={txn.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 16,
                    paddingVertical: 13,
                    borderBottomWidth: idx < lastTxns.length - 1 ? 1 : 0,
                    borderBottomColor: D.border,
                  }}
                >
                  <View style={{
                    width: 38,
                    height: 38,
                    borderRadius: 11,
                    backgroundColor: txn.es_anomala ? "rgba(248,113,113,0.08)" : D.surface,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                    borderWidth: txn.es_anomala ? 1 : 0,
                    borderColor: "rgba(248,113,113,0.2)",
                  }}>
                    <Text style={{ fontSize: 17 }}>{icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <Text style={{ color: D.text, fontSize: 13, fontWeight: "600" }} numberOfLines={1}>
                        {txn.comercio}
                      </Text>
                      {txn.es_anomala && (
                        <Ionicons name="warning" size={11} color={D.warning} />
                      )}
                    </View>
                    <Text style={{ color: D.textMuted, fontSize: 11, marginTop: 1 }}>
                      {txn.categoria} · {timeAgo(txn.fecha)}
                    </Text>
                  </View>
                  <Text style={{
                    color: isIncome ? D.success : D.text,
                    fontSize: 14,
                    fontWeight: "700",
                  }}>
                    {isIncome ? "+" : "-"}{formatMXN(txn.monto)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Havi insight strip ── */}
        <Pressable
          onPress={() => router.push("/(tabs)/chat")}
          style={({ pressed }) => ({
            marginHorizontal: 20,
            marginTop: 16,
            padding: 14,
            backgroundColor: pressed ? D.cardAlt : D.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: D.borderAccent,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          })}
        >
          <LinearGradient
            colors={["#06B6D4", "#818CF8"]}
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 12 }}>✦</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={{ color: D.text, fontSize: 13, lineHeight: 18 }}>
              Llevas{" "}
              <Text style={{ color: D.warning, fontWeight: "700" }}>
                {spendPct.toFixed(0)}%
              </Text>
              {" "}de tus ingresos gastados este mes
            </Text>
          </View>
          <Text style={{ color: D.accent, fontSize: 12, fontWeight: "600" }}>Analizar →</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Helpers ──────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 18) return "Buenas tardes";
  return "Buenas noches";
}

const QUICK_ACTIONS = [
  { id: "transferir", icon: "swap-horizontal-outline", label: "Transferir", accent: "#06B6D4" },
  { id: "pagar", icon: "receipt-outline", label: "Pagar", accent: "#4ADE80" },
  { id: "movimientos", icon: "bar-chart-outline", label: "Historial", accent: "#FBBF24" },
  { id: "alertas", icon: "shield-checkmark-outline", label: "Alertas", accent: "#F87171" },
];

function QuickAction({
  icon,
  label,
  accent,
  onPress,
}: {
  icon: string;
  label: string;
  accent: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ alignItems: "center", opacity: pressed ? 0.7 : 1 })}
    >
      <View style={{
        width: 54,
        height: 54,
        borderRadius: 16,
        backgroundColor: `${accent}12`,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: `${accent}20`,
        marginBottom: 7,
      }}>
        <Ionicons name={icon as any} size={22} color={accent} />
      </View>
      <Text style={{ color: "rgba(239,246,255,0.45)", fontSize: 11, fontWeight: "500" }}>
        {label}
      </Text>
    </Pressable>
  );
}
