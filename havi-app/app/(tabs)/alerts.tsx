// ============================================================
// ALERTS — Obsidian Intelligence dark mode
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

const D = {
  bg: "#07090E",
  surface: "#0F1318",
  card: "#161B27",
  cardAlt: "#1C2235",
  border: "rgba(255,255,255,0.07)",
  text: "#EFF6FF",
  textSub: "rgba(239,246,255,0.55)",
  textMuted: "rgba(239,246,255,0.30)",
  accent: "#06B6D4",
  success: "#4ADE80",
  warning: "#FBBF24",
  error: "#F87171",
};

const ALERT_CFG: Record<string, { icon: string; color: string }> = {
  txn_atipica: { icon: "shield-outline", color: "#F87171" },
  rechazo_saldo: { icon: "card-outline", color: "#FBBF24" },
  rechazo_limite: { icon: "card-outline", color: "#FBBF24" },
  cashback_proximo_perdido: { icon: "star-outline", color: "#06B6D4" },
  upselling_pro: { icon: "sparkles-outline", color: "#818CF8" },
  liquidez_proxima: { icon: "trending-down-outline", color: "#FBBF24" },
};

function getCfg(type: string) {
  return ALERT_CFG[type] ?? { icon: "notifications-outline", color: D.accent };
}

export default function AlertsScreen() {
  const { alerts, showAlert, markAsRead, unreadCount } = useAlerts();
  const router = useRouter();

  const urgentes = alerts.filter((a) => !a.accionada && a.priority === "alta");
  const pendientes = alerts.filter((a) => !a.accionada && a.priority !== "alta");
  const pasadas = alerts.filter((a) => a.accionada);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: D.bg }}>
      {/* Header */}
      <View style={{
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: D.border,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <View>
          <Text style={{ color: D.text, fontSize: 24, fontWeight: "800" }}>Alertas</Text>
          {unreadCount > 0 && (
            <Text style={{ color: D.textMuted, fontSize: 12, marginTop: 2 }}>
              {unreadCount} sin revisar
            </Text>
          )}
        </View>
        {unreadCount > 0 && (
          <View style={{
            backgroundColor: "rgba(248,113,113,0.12)",
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 5,
            borderWidth: 1,
            borderColor: "rgba(248,113,113,0.18)",
          }}>
            <Text style={{ color: D.error, fontSize: 13, fontWeight: "700" }}>
              {unreadCount}
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Urgentes ── */}
        {urgentes.length > 0 && (
          <View style={{ paddingHorizontal: 16, paddingTop: 20, marginBottom: 8 }}>
            <Text style={{
              color: D.textMuted,
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 1.4,
              textTransform: "uppercase",
              marginBottom: 10,
            }}>
              Requiere atención
            </Text>
            <View style={{ gap: 8 }}>
              {urgentes.map((a) => (
                <UrgentCard
                  key={a.id}
                  alert={a}
                  onPress={() => { markAsRead(a.id); showAlert(a); }}
                  onChat={() => router.push("/(tabs)/chat")}
                />
              ))}
            </View>
          </View>
        )}

        {/* ── Pendientes ── */}
        {pendientes.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginTop: urgentes.length > 0 ? 16 : 20 }}>
            <Text style={{
              color: D.textMuted,
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 1.4,
              textTransform: "uppercase",
              marginBottom: 10,
            }}>
              Pendientes
            </Text>
            <View style={{ gap: 8 }}>
              {pendientes.map((a) => (
                <AlertCard
                  key={a.id}
                  alert={a}
                  onPress={() => { markAsRead(a.id); showAlert(a); }}
                  onChat={() => router.push("/(tabs)/chat")}
                />
              ))}
            </View>
          </View>
        )}

        {/* ── Historial ── */}
        {pasadas.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
            <Text style={{
              color: D.textMuted,
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 1.4,
              textTransform: "uppercase",
              marginBottom: 10,
            }}>
              Historial
            </Text>
            <View style={{ gap: 6 }}>
              {pasadas.map((a) => (
                <AlertCard key={a.id} alert={a} onPress={() => {}} onChat={() => router.push("/(tabs)/chat")} dimmed />
              ))}
            </View>
          </View>
        )}

        {/* ── Empty ── */}
        {alerts.length === 0 && (
          <View style={{ alignItems: "center", paddingVertical: 80 }}>
            <View style={{
              width: 68,
              height: 68,
              borderRadius: 34,
              backgroundColor: "rgba(74,222,128,0.06)",
              borderWidth: 1,
              borderColor: "rgba(74,222,128,0.14)",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}>
              <Ionicons name="checkmark-done" size={30} color={D.success} />
            </View>
            <Text style={{ color: D.text, fontSize: 17, fontWeight: "700" }}>Todo en orden</Text>
            <Text style={{ color: D.textSub, fontSize: 14, marginTop: 8, textAlign: "center", lineHeight: 20 }}>
              Havi te avisará cuando detecte{"\n"}algo relevante
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Urgent Card — alta prioridad, énfasis visual ─────────────

function UrgentCard({
  alert,
  onPress,
  onChat,
}: { alert: HaviAlert; onPress: () => void; onChat: () => void }) {
  const cfg = getCfg(alert.type);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? "rgba(248,113,113,0.06)" : D.card,
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: "rgba(248,113,113,0.18)",
        borderLeftWidth: 3,
        borderLeftColor: D.error,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <View style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: "rgba(248,113,113,0.08)",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <Ionicons name={cfg.icon as any} size={18} color={D.error} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: D.text, fontSize: 14, fontWeight: "700", marginBottom: 2 }}>
            {alert.titulo}
          </Text>
          <Text style={{ color: D.textSub, fontSize: 13, lineHeight: 18 }} numberOfLines={2}>
            {alert.mensaje}
          </Text>
          <Text style={{ color: D.textMuted, fontSize: 11, marginTop: 4 }}>
            {timeAgo(alert.timestamp)}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable
          onPress={onPress}
          style={({ pressed }) => ({
            flex: 1,
            backgroundColor: pressed ? "#DC2626" : D.error,
            borderRadius: 12,
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
            backgroundColor: pressed ? D.cardAlt : D.surface,
            borderRadius: 12,
            paddingVertical: 11,
            alignItems: "center",
            borderWidth: 1,
            borderColor: D.border,
            flexDirection: "row",
            justifyContent: "center",
            gap: 5,
          })}
        >
          <Text style={{ fontSize: 11 }}>✦</Text>
          <Text style={{ color: D.textSub, fontSize: 13, fontWeight: "600" }}>Hablar con Havi</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

// ── Standard Alert Card ───────────────────────────────────────

function AlertCard({
  alert,
  onPress,
  onChat,
  dimmed = false,
}: { alert: HaviAlert; onPress: () => void; onChat: () => void; dimmed?: boolean }) {
  const cfg = getCfg(alert.type);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? D.cardAlt : D.card,
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: alert.leida ? D.border : `${cfg.color}22`,
        borderLeftWidth: alert.leida ? 1 : 3,
        borderLeftColor: alert.leida ? D.border : cfg.color,
        opacity: dimmed ? 0.45 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: `${cfg.color}0D`,
          alignItems: "center",
          justifyContent: "center",
        }}>
          <Ionicons name={cfg.icon as any} size={18} color={cfg.color} />
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <Text style={{ color: D.text, fontSize: 14, fontWeight: "600", flex: 1 }}>
              {alert.titulo}
            </Text>
            {!alert.leida && (
              <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: cfg.color }} />
            )}
          </View>
          <Text style={{ color: D.textSub, fontSize: 13, lineHeight: 18 }} numberOfLines={2}>
            {alert.mensaje}
          </Text>
          <Text style={{ color: D.textMuted, fontSize: 11, marginTop: 4 }}>
            {timeAgo(alert.timestamp)}
          </Text>
        </View>
      </View>

      {!alert.accionada && (
        <View style={{
          flexDirection: "row",
          gap: 8,
          marginTop: 12,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: D.border,
        }}>
          <Pressable
            onPress={onPress}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: pressed ? `${cfg.color}CC` : cfg.color,
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
              backgroundColor: pressed ? D.cardAlt : D.surface,
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: "center",
              borderWidth: 1,
              borderColor: D.border,
              flexDirection: "row",
              justifyContent: "center",
              gap: 5,
            })}
          >
            <Text style={{ fontSize: 11 }}>✦</Text>
            <Text style={{ color: D.textSub, fontSize: 13, fontWeight: "600" }}>Hablar con Havi</Text>
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}
