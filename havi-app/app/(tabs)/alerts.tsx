// ============================================================
// ALERTS SCREEN — Light mode fintech profesional
// ============================================================

import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
  error: "#EF4444",
  warning: "#F59E0B",
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

  const pendientes = alerts.filter((a) => !a.accionada);
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
        <Text style={{ color: C.textPrimary, fontSize: 24, fontWeight: "800" }}>Alertas</Text>
        {unreadCount > 0 && (
          <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 2 }}>
            {unreadCount} sin leer
          </Text>
        )}
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: C.surface }}
        contentContainerStyle={{ padding: 20, gap: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {pendientes.length > 0 && (
          <>
            <Text
              style={{
                color: C.textMuted,
                fontSize: 11,
                fontWeight: "700",
                marginBottom: 4,
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              Pendientes
            </Text>
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
          </>
        )}

        {pasadas.length > 0 && (
          <>
            <Text
              style={{
                color: C.textMuted,
                fontSize: 11,
                fontWeight: "700",
                marginTop: 16,
                marginBottom: 4,
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              Historial
            </Text>
            {pasadas.map((alert) => (
              <AlertItem
                key={alert.id}
                alert={alert}
                onPress={() => {}}
                onChat={() => router.push("/(tabs)/chat")}
                dimmed
              />
            ))}
          </>
        )}

        {alerts.length === 0 && (
          <View style={{ alignItems: "center", paddingVertical: 64 }}>
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
  const cfg = ALERT_CONFIG[alert.type] || {
    icon: "notifications-outline",
    color: C.accent,
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? C.surface : C.card,
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: alert.leida ? C.border : `${cfg.color}28`,
        opacity: dimmed ? 0.55 : 1,
        borderLeftWidth: alert.leida ? 1 : 3,
        borderLeftColor: alert.leida ? C.border : cfg.color,
        marginBottom: 2,
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
              {alert.accion_primaria?.label || "Ver detalles"}
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
