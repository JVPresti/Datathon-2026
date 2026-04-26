// ============================================================
// ALERTS — Hey Banco neutral dark
// Botones de acción ejecutan directamente (sin popup redundante)
// "Hablar con Havi" abre chat con prompt contextual
// ============================================================

import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAlerts } from "../../src/hooks/useAlerts";
import { HaviAlert } from "../../src/types";
import { timeAgo } from "../../src/data/mockData";

const D = {
  bg: "#000000",
  surface: "#111111",
  card: "#1C1C1E",
  cardAlt: "#2C2C2E",
  sep: "rgba(255,255,255,0.08)",
  text: "#FFFFFF",
  textSub: "rgba(255,255,255,0.55)",
  textMuted: "rgba(255,255,255,0.30)",
  success: "#30D158",
  warning: "#FF9F0A",
  error: "#FF453A",
};

function stripMd(s: string) { return s.replace(/\*\*|__|_|`|\*/g, ""); }

const ALERT_CFG: Record<string, { icon: string; color: string }> = {
  txn_atipica:              { icon: "shield-outline",       color: "#FF453A" },
  rechazo_saldo:            { icon: "card-outline",         color: "#FF9F0A" },
  rechazo_limite:           { icon: "card-outline",         color: "#FF9F0A" },
  cashback_proximo_perdido: { icon: "star-outline",         color: "#FFFFFF" },
  upselling_pro:            { icon: "sparkles-outline",     color: "#FFFFFF" },
  liquidez_proxima:         { icon: "trending-down-outline",color: "#FF9F0A" },
};

function getCfg(type: string) {
  return ALERT_CFG[type] ?? { icon: "notifications-outline", color: "rgba(255,255,255,0.60)" };
}

/** Genera un prompt contextual para abrir Havi con la alerta en contexto */
function buildHaviPrompt(alert: HaviAlert): string {
  switch (alert.type) {
    case "txn_atipica":
      return `Tengo una alerta de cargo inusual: "${stripMd(alert.mensaje)}". ¿Es fraude? ¿Qué hago?`;
    case "rechazo_saldo":
      return `Me rechazaron un cargo por saldo insuficiente: "${stripMd(alert.mensaje)}". ¿Cómo puedo resolverlo?`;
    case "rechazo_limite":
      return `Me rechazaron un cargo por límite de crédito: "${stripMd(alert.mensaje)}". ¿Qué opciones tengo?`;
    case "cashback_proximo_perdido":
      return `¿Cuánto cashback estoy perdiendo este mes por no tener Hey Pro? ¿Cómo lo activo?`;
    case "liquidez_proxima":
      return `Me alertaron sobre un posible problema de liquidez: "${stripMd(alert.mensaje)}". ¿Qué me recomiendas?`;
    default:
      return `Tengo una alerta: "${stripMd(alert.mensaje)}". ¿Puedes ayudarme?`;
  }
}

export default function AlertsScreen() {
  const { alerts, markAsRead, markAsActioned, unreadCount } = useAlerts();
  const router = useRouter();

  const urgentes  = alerts.filter((a) => !a.accionada && a.priority === "alta");
  const pendientes = alerts.filter((a) => !a.accionada && a.priority !== "alta");
  const pasadas   = alerts.filter((a) => a.accionada);

  function openChat(alert: HaviAlert) {
    markAsRead(alert.id);
    router.push({
      pathname: "/(tabs)/chat",
      params: { initialPrompt: buildHaviPrompt(alert) },
    });
  }

  function handlePrimaryAction(alert: HaviAlert) {
    markAsActioned(alert.id);
    const type = alert.accion_primaria?.type;
    if (type === "chat") {
      openChat(alert);
    } else if (type === "activate_pro") {
      router.push({
        pathname: "/(tabs)/chat",
        params: { initialPrompt: "¿Cuánto cashback estoy perdiendo este mes por no tener Hey Pro? Quiero activarlo." },
      });
    }
    // "approve", "transfer", "block", "dismiss" → marcar como accionada es suficiente
  }

  function handleSecondaryAction(alert: HaviAlert) {
    markAsActioned(alert.id);
    const type = alert.accion_secundaria?.type;
    if (type === "chat") {
      openChat(alert);
    }
    // "dismiss" → solo marca como accionada
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: D.bg }}>
      {/* Header */}
      <View style={{
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: D.sep,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <Text style={{ color: D.text, fontSize: 24, fontWeight: "700" }}>Buzón</Text>
        {unreadCount > 0 && (
          <View style={{
            backgroundColor: D.card,
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: "rgba(255,255,255,0.10)",
          }}>
            <Text style={{ color: D.text, fontSize: 13, fontWeight: "600" }}>
              {unreadCount} sin leer
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
          <View style={{ paddingHorizontal: 16, paddingTop: 18, marginBottom: 8 }}>
            <Text style={styles.sectionLabel}>Requiere atención</Text>
            <View style={{ gap: 10 }}>
              {urgentes.map((a) => (
                <UrgentCard
                  key={a.id}
                  alert={a}
                  onPrimary={() => handlePrimaryAction(a)}
                  onHavi={() => openChat(a)}
                />
              ))}
            </View>
          </View>
        )}

        {/* ── Pendientes ── */}
        {pendientes.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginTop: urgentes.length > 0 ? 14 : 18 }}>
            <Text style={styles.sectionLabel}>Pendientes</Text>
            <View style={{ gap: 8 }}>
              {pendientes.map((a) => (
                <AlertCard
                  key={a.id}
                  alert={a}
                  onPrimary={() => handlePrimaryAction(a)}
                  onSecondary={() => handleSecondaryAction(a)}
                  onHavi={() => openChat(a)}
                />
              ))}
            </View>
          </View>
        )}

        {/* ── Historial ── */}
        {pasadas.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginTop: 22 }}>
            <Text style={styles.sectionLabel}>Historial</Text>
            <View style={{ gap: 6 }}>
              {pasadas.map((a) => (
                <AlertCard key={a.id} alert={a} dimmed />
              ))}
            </View>
          </View>
        )}

        {/* ── Empty ── */}
        {alerts.length === 0 && (
          <View style={{ alignItems: "center", paddingVertical: 72 }}>
            <View style={{
              width: 60, height: 60, borderRadius: 30,
              backgroundColor: D.card,
              alignItems: "center", justifyContent: "center",
              marginBottom: 14,
            }}>
              <Ionicons name="checkmark-done" size={28} color={D.success} />
            </View>
            <Text style={{ color: D.text, fontSize: 17, fontWeight: "600" }}>Todo en orden</Text>
            <Text style={{ color: D.textMuted, fontSize: 14, marginTop: 6, textAlign: "center" }}>
              Havi te avisará cuando detecte{"\n"}algo relevante
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Urgent Card ──────────────────────────────────────────────
function UrgentCard({
  alert,
  onPrimary,
  onHavi,
}: {
  alert: HaviAlert;
  onPrimary?: () => void;
  onHavi?: () => void;
}) {
  const cfg = getCfg(alert.type);
  return (
    <View style={{
      backgroundColor: "#161616",
      borderRadius: 18,
      overflow: "hidden",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "rgba(255,69,58,0.25)",
    }}>
      {/* Top accent bar */}
      <View style={{ height: 2, backgroundColor: D.error, opacity: 0.85 }} />

      <View style={{ padding: 16 }}>
        {/* Header row */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
          <View style={{
            width: 38, height: 38, borderRadius: 12,
            backgroundColor: "rgba(255,69,58,0.12)",
            alignItems: "center", justifyContent: "center",
          }}>
            <Ionicons name={cfg.icon as any} size={18} color={D.error} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: D.text, fontSize: 14, fontWeight: "700", marginBottom: 3 }}>
              {alert.titulo}
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, lineHeight: 19 }} numberOfLines={3}>
              {stripMd(alert.mensaje)}
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, marginTop: 5 }}>
              {timeAgo(alert.timestamp)}
            </Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={onPrimary}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: pressed ? "rgba(255,69,58,0.75)" : D.error,
              borderRadius: 11,
              paddingVertical: 11,
              alignItems: "center",
            })}
          >
            <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }} numberOfLines={1}>
              {alert.accion_primaria?.label ?? "Ver detalles"}
            </Text>
          </Pressable>
          <Pressable
            onPress={onHavi}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: pressed ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.05)",
              borderRadius: 11,
              paddingVertical: 11,
              alignItems: "center",
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: "rgba(255,255,255,0.12)",
              flexDirection: "row",
              justifyContent: "center",
              gap: 6,
            })}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 13 }}>✦</Text>
            <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, fontWeight: "600" }}>
              Consultar Havi
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ── Regular Alert Card ───────────────────────────────────────
function AlertCard({
  alert,
  onPrimary,
  onSecondary,
  onHavi,
  dimmed = false,
}: {
  alert: HaviAlert;
  onPrimary?: () => void;
  onSecondary?: () => void;
  onHavi?: () => void;
  dimmed?: boolean;
}) {
  const cfg = getCfg(alert.type);
  const showActions = !alert.accionada && !dimmed;

  return (
    <View style={{
      backgroundColor: "#141414",
      borderRadius: 16,
      overflow: "hidden",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: alert.leida
        ? "rgba(255,255,255,0.07)"
        : `${cfg.color}33`,
      opacity: dimmed ? 0.38 : 1,
    }}>
      {/* Accent bar only on unread */}
      {!alert.leida && (
        <View style={{ height: 2, backgroundColor: cfg.color, opacity: 0.70 }} />
      )}

      <View style={{ padding: 14 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
          <View style={{
            width: 36, height: 36, borderRadius: 10,
            backgroundColor: "rgba(255,255,255,0.05)",
            alignItems: "center", justifyContent: "center",
          }}>
            <Ionicons name={cfg.icon as any} size={17} color={cfg.color} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 }}>
              <Text style={{ color: D.text, fontSize: 14, fontWeight: "600", flex: 1 }}>
                {alert.titulo}
              </Text>
              {!alert.leida && (
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: cfg.color }} />
              )}
            </View>
            <Text style={{ color: "rgba(255,255,255,0.50)", fontSize: 13, lineHeight: 18 }} numberOfLines={2}>
              {stripMd(alert.mensaje)}
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.22)", fontSize: 11, marginTop: 5 }}>
              {timeAgo(alert.timestamp)}
            </Text>
          </View>
        </View>

        {/* Actions */}
        {showActions && (
          <View style={{
            flexDirection: "row",
            gap: 8,
            marginTop: 12,
            paddingTop: 12,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: "rgba(255,255,255,0.07)",
          }}>
            {/* Primary */}
            <Pressable
              onPress={onPrimary}
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: pressed ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.06)",
                borderRadius: 10,
                paddingVertical: 9,
                alignItems: "center",
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: "rgba(255,255,255,0.10)",
              })}
            >
              <Text style={{ color: D.text, fontSize: 13, fontWeight: "600" }}>
                {alert.accion_primaria?.label ?? "Ver detalles"}
              </Text>
            </Pressable>

            {/* Havi button */}
            <Pressable
              onPress={onHavi}
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: pressed ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
                borderRadius: 10,
                paddingVertical: 9,
                alignItems: "center",
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: "rgba(255,255,255,0.09)",
                flexDirection: "row",
                justifyContent: "center",
                gap: 5,
              })}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 13 }}>✦</Text>
              <Text style={{ color: "rgba(255,255,255,0.60)", fontSize: 13, fontWeight: "500" }}>
                Havi
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    color: "rgba(255,255,255,0.28)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 10,
  },
});
