// ============================================================
// HOME — Dashboard principal
// Hey Banco design language: neutral black, flat cards, white text
// ============================================================

import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAlerts } from "../../src/hooks/useAlerts";
import {
  DEMO_USER,
  TRANSACCIONES_MOCK,
  UC2_MOCK,
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
import { MarkdownText } from "../../src/utils/markdown";
import { useToast } from "../../src/hooks/useToast";

// Hey Banco palette: neutral dark, no accent color
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

// UC2 data for Digital Twin card
const uc2 = UC2_MOCK;

const CAT_ICONS: Record<string, string> = {
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
  const { showToast } = useToast();
  const user = DEMO_USER;
  const [showBalance, setShowBalance] = useState(true);
  const [showUC3, setShowUC3] = useState(false);
  const [uc3Payload, setUC3Payload] = useState<{ text: string; suggestions: string[] } | null>(null);

  const lastTxns = TRANSACCIONES_MOCK.slice(0, 4);
  const spendPct = Math.min((user.gasto_acumulado_mes / user.ingreso_mensual) * 100, 100);
  const urgentAlert = alerts.find((a) => !a.leida && a.priority === "alta");

  useEffect(() => {
    if (urgentAlert) {
      const t = setTimeout(() => showAlert(urgentAlert), 1500);
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
          paddingBottom: 4,
        }}>
          <View>
            <Text style={{ color: D.textMuted, fontSize: 12 }}>{getGreeting()}</Text>
            <Text style={{ color: D.text, fontSize: 22, fontWeight: "700", marginTop: 1 }}>
              {user.nombre}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Pressable
              onPress={() => router.push("/(tabs)/alerts")}
              style={({ pressed }) => ({
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: pressed ? D.card : "transparent",
                alignItems: "center",
                justifyContent: "center",
              })}
            >
              <Ionicons name="notifications-outline" size={22} color={D.textSub} />
              {unreadCount > 0 && (
                <View style={{
                  position: "absolute",
                  top: 7,
                  right: 7,
                  width: 7,
                  height: 7,
                  borderRadius: 3.5,
                  backgroundColor: D.error,
                }} />
              )}
            </Pressable>
            <Pressable
              onPress={() => router.push("/(tabs)/profile")}
              style={({ pressed }) => ({
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: pressed ? D.card : "transparent",
                alignItems: "center",
                justifyContent: "center",
              })}
            >
              <Ionicons name="person-outline" size={22} color={D.textSub} />
            </Pressable>
          </View>
        </View>

        {/* ── Balance Card ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}>
          <View style={{
            backgroundColor: D.card,
            borderRadius: 20,
            padding: 22,
          }}>
            {/* Balance row */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={{ color: D.textMuted, fontSize: 12 }}>Saldo disponible</Text>
              <Pressable
                onPress={() => setShowBalance(!showBalance)}
                hitSlop={12}
              >
                <Text style={{ color: D.textMuted, fontSize: 12 }}>
                  {showBalance ? "Ocultar" : "Mostrar"}
                </Text>
              </Pressable>
            </View>

            <Text style={{
              color: D.text,
              fontSize: 38,
              fontWeight: "700",
              letterSpacing: -0.5,
              marginBottom: 20,
            }}>
              {showBalance ? formatMXN(user.balance_actual) : "••••••"}
            </Text>

            {/* Income / Expenses */}
            <View style={{
              flexDirection: "row",
              gap: 16,
              paddingTop: 16,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: D.sep,
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: D.textMuted, fontSize: 11, marginBottom: 3 }}>Ingresos</Text>
                <Text style={{ color: D.success, fontSize: 15, fontWeight: "600" }}>
                  {showBalance ? formatMXN(user.ingreso_mensual) : "••••"}
                </Text>
              </View>
              <View style={{ width: StyleSheet.hairlineWidth, backgroundColor: D.sep }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: D.textMuted, fontSize: 11, marginBottom: 3 }}>Gastos del mes</Text>
                <Text style={{ color: D.text, fontSize: 15, fontWeight: "600" }}>
                  {showBalance ? formatMXN(user.gasto_acumulado_mes) : "••••"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Alerta urgente inline ── */}
        {urgentAlert && (
          <Pressable
            onPress={() => showAlert(urgentAlert)}
            style={({ pressed }) => ({
              marginHorizontal: 20,
              marginBottom: 16,
              padding: 14,
              backgroundColor: pressed ? "rgba(255,69,58,0.12)" : "rgba(255,69,58,0.08)",
              borderRadius: 14,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: "rgba(255,69,58,0.25)",
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            })}
          >
            <Ionicons name="warning" size={16} color={D.error} />
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

        {/* ── UC3 Banner proactivo ── */}
        {showUC3 && uc3Payload && (
          <View style={{
            marginHorizontal: 20,
            marginBottom: 16,
            padding: 16,
            backgroundColor: D.card,
            borderRadius: 16,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: "rgba(255,255,255,0.12)",
          }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
              <Text style={{ color: D.text, fontSize: 17 }}>✦</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: D.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
                  Havi · Sugerencia
                </Text>
                <MarkdownText
                  text={uc3Payload.text}
                  style={{ color: D.text, fontSize: 13, lineHeight: 19 }}
                />
              </View>
              <Pressable onPress={() => setShowUC3(false)} hitSlop={10}>
                <Ionicons name="close" size={16} color={D.textMuted} />
              </Pressable>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() => {
                  executePayrollPortability();
                  setShowUC3(false);
                  showToast("Solicitud de Hey Pro enviada. Havi te avisará pronto.", "success");
                }}
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor: pressed ? "#E5E5E5" : "#FFFFFF",
                  borderRadius: 10,
                  paddingVertical: 10,
                  alignItems: "center",
                })}
              >
                <Text style={{ color: "#000000", fontSize: 13, fontWeight: "700" }}>Activar</Text>
              </Pressable>
              <Pressable
                onPress={() => setShowUC3(false)}
                style={({ pressed }) => ({
                  paddingHorizontal: 16,
                  backgroundColor: pressed ? D.cardAlt : D.surface,
                  borderRadius: 10,
                  paddingVertical: 10,
                  alignItems: "center",
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: D.sep,
                })}
              >
                <Text style={{ color: D.textSub, fontSize: 13 }}>Ahora no</Text>
              </Pressable>
            </View>
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
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={{ color: D.text, fontSize: 16, fontWeight: "700" }}>Últimos movimientos</Text>
            <Pressable onPress={() => router.push("/(tabs)/movements")}>
              <Text style={{ color: D.textSub, fontSize: 13 }}>Ver todos</Text>
            </Pressable>
          </View>

          <View style={{ backgroundColor: D.card, borderRadius: 16, overflow: "hidden" }}>
            {lastTxns.map((txn, idx) => {
              const icon = CAT_ICONS[txn.categoria] ?? CAT_ICONS.default;
              const isIncome = txn.tipo === "abono";
              return (
                <View key={txn.id} style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 13,
                  borderBottomWidth: idx < lastTxns.length - 1 ? StyleSheet.hairlineWidth : 0,
                  borderBottomColor: D.sep,
                }}>
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: D.surface,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}>
                    <Text style={{ fontSize: 17 }}>{icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <Text style={{ color: D.text, fontSize: 13, fontWeight: "500" }} numberOfLines={1}>
                        {txn.comercio}
                      </Text>
                      {txn.es_anomala && (
                        <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: D.warning }} />
                      )}
                    </View>
                    <Text style={{ color: D.textMuted, fontSize: 11, marginTop: 1 }}>
                      {txn.categoria}
                    </Text>
                  </View>
                  <Text style={{ color: isIncome ? D.success : D.text, fontSize: 14, fontWeight: "600" }}>
                    {isIncome ? "+" : "-"}{formatMXN(txn.monto)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── UC2 Digital Twin Card ── */}
        <Pressable
          onPress={() => router.push("/(tabs)/chat")}
          style={({ pressed }) => ({
            marginHorizontal: 20,
            marginTop: 12,
            backgroundColor: pressed ? D.cardAlt : D.card,
            borderRadius: 16,
            overflow: "hidden",
          })}
        >
          {/* Header strip */}
          <View style={{
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 10,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: D.sep,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}>
            <Text style={{ color: D.text, fontSize: 14 }}>✦</Text>
            <Text style={{ color: D.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 0.9, textTransform: "uppercase", flex: 1 }}>
              Gemelo Digital
            </Text>
            <Text style={{ color: D.textMuted, fontSize: 12 }}>Simular →</Text>
          </View>
          {/* Stats row */}
          <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingVertical: 14, gap: 0 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: D.textMuted, fontSize: 11, marginBottom: 4 }}>Proyección fin de mes</Text>
              <Text style={{ color: uc2.gasto_estimado_fin_mes > uc2.ingreso_mensual ? D.warning : D.text, fontSize: 18, fontWeight: "700" }}>
                {showBalance ? formatMXN(uc2.gasto_estimado_fin_mes) : "••••"}
              </Text>
              <Text style={{ color: D.textMuted, fontSize: 11, marginTop: 2 }}>
                vs ingreso {showBalance ? formatMXN(uc2.ingreso_mensual) : "••••"}
              </Text>
            </View>
            <View style={{ width: StyleSheet.hairlineWidth, backgroundColor: D.sep }} />
            <View style={{ flex: 1, paddingLeft: 16 }}>
              <Text style={{ color: D.textMuted, fontSize: 11, marginBottom: 4 }}>Déficit estimado</Text>
              <Text style={{ color: D.error, fontSize: 18, fontWeight: "700" }}>
                {showBalance ? `-${formatMXN(Math.abs(uc2.deficit_proyectado))}` : "••••"}
              </Text>
              <Text style={{ color: D.textMuted, fontSize: 11, marginTop: 2 }}>
                Corte en {uc2.dias_al_corte} días
              </Text>
            </View>
          </View>
          {/* Havi message */}
          <View style={{
            marginHorizontal: 12,
            marginBottom: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: D.surface,
            borderRadius: 10,
          }}>
            <Text style={{ color: D.textSub, fontSize: 12, lineHeight: 17 }}>
              Si sigues gastando en <Text style={{ color: D.warning, fontWeight: "600" }}>{uc2.categoria_problema}</Text> al mismo ritmo, te faltarán fondos para las mensualidades. Toca para simular.
            </Text>
          </View>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 18) return "Buenas tardes";
  return "Buenas noches";
}

const QUICK_ACTIONS = [
  { id: "transferir", icon: "swap-horizontal-outline", label: "Transferir" },
  { id: "pagar", icon: "receipt-outline", label: "Pagar" },
  { id: "movimientos", icon: "bar-chart-outline", label: "Historial" },
  { id: "alertas", icon: "shield-checkmark-outline", label: "Alertas" },
];

function QuickAction({ icon, label, onPress }: { icon: string; label: string; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ alignItems: "center", opacity: pressed ? 0.6 : 1 })}
    >
      <View style={{
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: D.card,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 6,
      }}>
        <Ionicons name={icon as any} size={22} color="rgba(255,255,255,0.80)" />
      </View>
      <Text style={{ color: D.textMuted, fontSize: 11 }}>{label}</Text>
    </Pressable>
  );
}

// Need StyleSheet for hairlineWidth
import { StyleSheet } from "react-native";
