// ============================================================
// ALERTS — Hey Banco neutral dark
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

const ALERT_CFG: Record<string, { icon: string; color: string }> = {
  txn_atipica: { icon: "shield-outline", color: "#FF453A" },
  rechazo_saldo: { icon: "card-outline", color: "#FF9F0A" },
  rechazo_limite: { icon: "card-outline", color: "#FF9F0A" },
  cashback_proximo_perdido: { icon: "star-outline", color: "#FFFFFF" },
  upselling_pro: { icon: "sparkles-outline", color: "#FFFFFF" },
  liquidez_proxima: { icon: "trending-down-outline", color: "#FF9F0A" },
};

function getCfg(type: string) {
  return ALERT_CFG[type] ?? { icon: "notifications-outline", color: "rgba(255,255,255,0.60)" };
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
        paddingBottom: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: D.sep,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <Text style={{ color: D.text, fontSize: 24, fontWeight: "700" }}>Alertas</Text>
        {unreadCount > 0 && (
          <View style={{
            backgroundColor: D.card,
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 4,
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
          <View style={{ paddingHorizontal: 16, marginTop: urgentes.length > 0 ? 14 : 18 }}>
            <Text style={styles.sectionLabel}>Pendientes</Text>
            <View style={{ gap: 6 }}>
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
          <View style={{ paddingHorizontal: 16, marginTop: 22 }}>
            <Text style={styles.sectionLabel}>Historial</Text>
            <View style={{ gap: 4 }}>
              {pasadas.map((a) => (
                <AlertCard key={a.id} alert={a} onPress={() => {}} onChat={() => router.push("/(tabs)/chat")} dimmed />
              ))}
            </View>
          </View>
        )}

        {/* ── Empty ── */}
        {alerts.length === 0 && (
          <View style={{ alignItems: "center", paddingVertical: 72 }}>
            <View style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: D.card,
              alignItems: "center",
              justifyContent: "center",
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

function UrgentCard({ alert, onPress, onChat }: { alert: HaviAlert; onPress: () => void; onChat: () => void }) {
  const cfg = getCfg(alert.type);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? D.cardAlt : D.card,
        borderRadius: 16,
        padding: 16,
        borderLeftWidth: 3,
        borderLeftColor: D.error,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <View style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          backgroundColor: "rgba(255,69,58,0.10)",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <Ionicons name={cfg.icon as any} size={17} color={D.error} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: D.text, fontSize: 14, fontWeight: "600", marginBottom: 2 }}>{alert.titulo}</Text>
          <Text style={{ color: D.textSub, fontSize: 13, lineHeight: 18 }} numberOfLines={2}>{alert.mensaje}</Text>
          <Text style={{ color: D.textMuted, fontSize: 11, marginTop: 4 }}>{timeAgo(alert.timestamp)}</Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable
          onPress={onPress}
          style={({ pressed }) => ({
            flex: 1,
            backgroundColor: pressed ? "#CC0000" : D.error,
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
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: D.sep,
            flexDirection: "row",
            justifyContent: "center",
            gap: 5,
          })}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 13 }}>✦</Text>
          <Text style={{ color: D.textSub, fontSize: 13, fontWeight: "500" }}>Hablar con Havi</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

function AlertCard({ alert, onPress, onChat, dimmed = false }: { alert: HaviAlert; onPress: () => void; onChat: () => void; dimmed?: boolean }) {
  const cfg = getCfg(alert.type);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? D.cardAlt : D.card,
        borderRadius: 14,
        padding: 14,
        borderLeftWidth: alert.leida ? 0 : 3,
        borderLeftColor: cfg.color,
        opacity: dimmed ? 0.40 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: D.surface,
          alignItems: "center",
          justifyContent: "center",
        }}>
          <Ionicons name={cfg.icon as any} size={17} color={cfg.color} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <Text style={{ color: D.text, fontSize: 14, fontWeight: "500", flex: 1 }}>{alert.titulo}</Text>
            {!alert.leida && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: cfg.color }} />}
          </View>
          <Text style={{ color: D.textSub, fontSize: 13, lineHeight: 18 }} numberOfLines={2}>{alert.mensaje}</Text>
          <Text style={{ color: D.textMuted, fontSize: 11, marginTop: 4 }}>{timeAgo(alert.timestamp)}</Text>
        </View>
      </View>
      {!alert.accionada && (
        <View style={{
          flexDirection: "row",
          gap: 8,
          marginTop: 12,
          paddingTop: 12,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: D.sep,
        }}>
          <Pressable
            onPress={onPress}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: pressed ? D.cardAlt : D.surface,
              borderRadius: 10,
              paddingVertical: 9,
              alignItems: "center",
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: D.sep,
            })}
          >
            <Text style={{ color: D.text, fontSize: 13, fontWeight: "500" }}>
              {alert.accion_primaria?.label ?? "Ver detalles"}
            </Text>
          </Pressable>
          <Pressable
            onPress={onChat}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: pressed ? D.cardAlt : D.surface,
              borderRadius: 10,
              paddingVertical: 9,
              alignItems: "center",
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: D.sep,
              flexDirection: "row",
              justifyContent: "center",
              gap: 5,
            })}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 13 }}>✦</Text>
            <Text style={{ color: D.textSub, fontSize: 13 }}>Havi</Text>
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    color: "rgba(255,255,255,0.30)",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 10,
  },
});
