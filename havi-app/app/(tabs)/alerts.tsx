// ============================================================
// ALERTS SCREEN — Light mode fintech profesional
// Sección "Requiere atención" con énfasis visual superior
// ============================================================

import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAlerts } from "../../src/hooks/useAlerts";
import { HaviAlert } from "../../src/types";
import { timeAgo } from "../../src/data/mockData";

const C = {
  bg: "#FFFFFF",
  surface: "#FAFAFA",
  card: "#FFFFFF",
  border: "#F0F0F0",
  borderAlt: "#E5E7EB",
  textPrimary: "#111111",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  accent: "#6D5EF8",
  accentLight: "#EEF2FF",
  error: "#EF4444",
  errorLight: "#FEF2F2",
  warning: "#F59E0B",
  warningLight: "#FFFBEB",
  success: "#10B981",
};

const ALERT_CONFIG: Record<string, { icon: string; color: string }> = {
  txn_atipica: { icon: "shield-outline", color: C.error },
  rechazo_saldo: { icon: "card-outline", color: C.warning },
  rechazo_limite: { icon: "card-outline", color: C.warning },
  cashback_proximo_perdido: { icon: "star-outline", color: C.accent },
  upselling_pro: { icon: "star-outline", color: C.accent },
  liquidez_proxima: { icon: "trending-down-outline", color: C.warning },
};

export default function AlertsScreen() {
  const { alerts, showAlert, markAsRead, unreadCount } = useAlerts();
  const router = useRouter();

  const urgentes = alerts.filter((a) => !a.accionada && a.priority === "alta");
  const pendientes = alerts.filter((a) => !a.accionada && a.priority !== "alta");
  const pasadas = alerts.filter((a) => a.accionada);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
        }}
      >
        <Text style={{ color: C.textPrimary, fontSize: 24, fontWeight: "800" }}>
          Alertas
        </Text>
        {unreadCount > 0 && (
          <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 2 }}>
            {unreadCount} sin leer
          </Text>
        )}
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: C.surface }}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── REQUIERE ATENCIÓN — Sección prominente ── */}
        {urgentes.length > 0 && (
          <View style={{ marginTop: 16, marginHorizontal: 16, marginBottom: 8 }}>
            {/* Banner header de sección */}
            <LinearGradient
              colors={["#FEF2F2", "#FFF5F5"]}
              style={{
                borderRadius: 20,
                borderWidth: 1.5,
                borderColor: "rgba(239,68,68,0.2)",
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  paddingHorizontal: 18,
                  paddingTop: 16,
                  paddingBottom: 4,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    backgroundColor: "rgba(239,68,68,0.12)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="alert-circle" size={18} color={C.error} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.error, fontSize: 14, fontWeight: "800" }}>
                    Requiere atención
                  </Text>
                  <Text style={{ color: "rgba(239,68,68,0.7)", fontSize: 12, marginTop: 1 }}>
                    {urgentes.length} alerta{urgentes.length > 1 ? "s" : ""} pendiente{urgentes.length > 1 ? "s" : ""}
                  </Text>
                </View>
              </View>

              <View style={{ padding: 12, gap: 8 }}>
                {urgentes.map((alert) => (
                  <AlertItemUrgent
                    key={alert.id}
                    alert={alert}
                    onPress={() => {
                      markAsRead(alert.id);
                      showAlert(alert);
                    }}
                    onChat={() => router.push("/(tabs)/chat")}
                  />
                ))}
              </View>
            </LinearGradient>
          </View>
        )}

        {/* ── Pendientes (prioridad media/baja) ── */}
        {pendientes.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginTop: urgentes.length > 0 ? 8 : 16 }}>
            <Text
              style={{
                color: C.textMuted,
                fontSize: 11,
                fontWeight: "700",
                marginBottom: 8,
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              Pendientes
            </Text>
            <View style={{ gap: 8 }}>
              {pendientes.map((alert) => (
                <AlertItem
                  key={alert.id}
                  alert={alert}
                  onPress={() => {
                    markAsRead(alert.id);
                    showAlert(alert);
                  }}
                  onChat={() => router.push("/(tabs)/chat")}
                />
              ))}
            </View>
          </View>
        )}

        {/* ── Historial ── */}
        {pasadas.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
            <Text
              style={{
                color: C.textMuted,
                fontSize: 11,
                fontWeight: "700",
                marginBottom: 8,
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              Historial
            </Text>
            <View style={{ gap: 8 }}>
              {pasadas.map((alert) => (
                <AlertItem
                  key={alert.id}
                  alert={alert}
                  onPress={() => {}}
                  onChat={() => router.push("/(tabs)/chat")}
                  dimmed
                />
              ))}
            </View>
          </View>
        )}

        {/* ── Estado vacío ── */}
        {alerts.length === 0 && (
          <View style={{ alignItems: "center", paddingVertical: 72 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: "rgba(16,185,129,0.08)",
                borderWidth: 1,
                borderColor: "rgba(16,185,129,0.15)",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Ionicons name="checkmark-done-outline" size={32} color={C.success} />
            </View>
            <Text style={{ color: C.textPrimary, fontSize: 18, fontWeight: "700" }}>
              Todo en orden
            </Text>
            <Text
              style={{
                color: C.textSecondary,
                fontSize: 14,
                marginTop: 8,
                textAlign: "center",
                lineHeight: 20,
              }}
            >
              Havi te avisará cuando detecte{"\n"}algo relevante
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Alerta urgente — card compacta con énfasis visual ────────
function AlertItemUrgent({
  alert,
  onPress,
  onChat,
}: {
  alert: HaviAlert;
  onPress: () => void;
  onChat: () => void;
}) {
  const cfg = ALERT_CONFIG[alert.type] ?? { icon: "notifications-outline", color: C.error };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? "rgba(239,68,68,0.06)" : "#FFFFFF",
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: "rgba(239,68,68,0.18)",
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: "rgba(239,68,68,0.10)",
            borderWidth: 1,
            borderColor: "rgba(239,68,68,0.18)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={cfg.icon as any} size={18} color={C.error} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.textPrimary, fontSize: 14, fontWeight: "700", marginBottom: 2 }}>
            {alert.titulo}
          </Text>
          <Text style={{ color: C.textSecondary, fontSize: 13, lineHeight: 18 }} numberOfLines={2}>
            {alert.mensaje}
          </Text>
          <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 4 }}>
            {timeAgo(alert.timestamp)}
          </Text>
        </View>
      </View>

      {/* CTAs prominentes */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable
          onPress={onPress}
          style={({ pressed }) => ({
            flex: 1,
            backgroundColor: pressed ? "#DC2626" : C.error,
            borderRadius: 10,
            paddingVertical: 11,
            alignItems: "center",
          })}
        >
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>
            {alert.accion_primaria?.label ?? "Ver detalles"}
          </Text>
        </Pressable>
        <Pressable
          onPress={onChat}
          style={({ pressed }) => ({
            flex: 1,
            backgroundColor: pressed ? C.borderAlt : C.bg,
            borderRadius: 10,
            paddingVertical: 11,
            alignItems: "center",
            borderWidth: 1,
            borderColor: C.border,
            flexDirection: "row",
            justifyContent: "center",
            gap: 5,
          })}
        >
          <Text style={{ fontSize: 11 }}>✦</Text>
          <Text style={{ color: C.textSecondary, fontSize: 13, fontWeight: "600" }}>
            Hablar con Havi
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

// ── Alerta estándar (media/baja) ─────────────────────────────
function AlertItem({
  alert,
  onPress,
  onChat,
  dimmed = false,
}: {
  alert: HaviAlert;
  onPress: () => void;
  onChat: () => void;
  dimmed?: boolean;
}) {
  const cfg = ALERT_CONFIG[alert.type] ?? {
    icon: "notifications-outline",
    color: C.accent,
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? C.surface : C.card,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: alert.leida ? C.border : `${cfg.color}28`,
        opacity: dimmed ? 0.55 : 1,
        borderLeftWidth: alert.leida ? 1 : 3,
        borderLeftColor: alert.leida ? C.border : cfg.color,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 13,
            backgroundColor: `${cfg.color}0E`,
            borderWidth: 1,
            borderColor: `${cfg.color}18`,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <Text style={{ color: C.textPrimary, fontSize: 14, fontWeight: "600", flex: 1 }}>
              {alert.titulo}
            </Text>
            {!alert.leida && (
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 3.5,
                  backgroundColor: cfg.color,
                }}
              />
            )}
          </View>
          <Text style={{ color: C.textSecondary, fontSize: 13, lineHeight: 18 }} numberOfLines={2}>
            {alert.mensaje}
          </Text>
          <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 5 }}>
            {timeAgo(alert.timestamp)}
          </Text>
        </View>
      </View>

      {!alert.accionada && (
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            marginTop: 12,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: C.border,
          }}
        >
          <Pressable
            onPress={onPress}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: pressed ? `${cfg.color}DD` : cfg.color,
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: "center",
            })}
          >
            <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>
              {alert.accion_primaria?.label ?? "Ver detalles"}
            </Text>
          </Pressable>
          <Pressable
            onPress={onChat}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: pressed ? C.surface : C.bg,
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: "center",
              borderWidth: 1,
              borderColor: C.border,
              flexDirection: "row",
              justifyContent: "center",
              gap: 5,
            })}
          >
            <Text style={{ fontSize: 12 }}>✦</Text>
            <Text style={{ color: C.textSecondary, fontSize: 13, fontWeight: "600" }}>
              Hablar con Havi
            </Text>
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}
