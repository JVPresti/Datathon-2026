// ============================================================
// HOME — Dashboard principal
// Hey Banco design language: neutral black, flat cards, white text
// ============================================================

import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAlerts } from "../../src/hooks/useAlerts";
import {
  DEMO_USERS,
  TRANSACCIONES_MOCK,
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
import { useHaviContext } from "../../src/hooks/useHaviContext";

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
  const {
    isLoading: contextLoading,
    isConnected,
    userId,
    uc2,
    uc3,
    ingreso_mensual,
    tiene_hey_pro,
    userName,
  } = useHaviContext();

  const user = DEMO_USERS.find((u) => u.user_id === userId) || DEMO_USERS[0];
  const [showBalance, setShowBalance] = useState(true);
  const [showUC3, setShowUC3] = useState(false);
  const [uc3Payload, setUC3Payload] = useState<{ text: string; suggestions: string[] } | null>(null);

  const lastTxns = TRANSACCIONES_MOCK.slice(0, 4);
  const urgentAlert = alerts.find((a) => !a.leida && a.priority === "alta");

  // Use real ingreso from pipeline context (falls back to DEMO_USER value)
  const ingresoDisplay = ingreso_mensual || user.ingreso_mensual;
  const gastoDisplay = uc2.gasto_acumulado_mes;

  useEffect(() => {
    if (urgentAlert) {
      const t = setTimeout(() => showAlert(urgentAlert), 1500);
      return () => clearTimeout(t);
    }
  }, [urgentAlert]);

  useEffect(() => {
    // Cuando el usuario cambia, limpiamos los mensajes proactivos viejos
    setShowUC3(false);
    setUC3Payload(null);
  }, [userId]);

  useEffect(() => {
    const t = setTimeout(() => {
      // Use real UC3 data if pipeline is connected, else compute from mocks
      const cashbackLost = uc3?.cashback_perdido_mes ?? 0;
      const shouldShow = !tiene_hey_pro && (isConnected ? cashbackLost > 0 : shouldFireUC3());
      if (shouldShow) {
        markUC3Fired();
        if (isConnected && uc3) {
          setUC3Payload({
            text:
              `${userName}, una cosa antes de que sigas 💡 ` +
              `Con tus compras de este mes habrías ganado **$${cashbackLost.toFixed(2)}** en cashback con Hey Pro. ` +
              `Al año son **$${(cashbackLost * 12).toFixed(2)}** de regreso a tu bolsillo. Solo necesitas domiciliar tu nómina aquí.`,
            suggestions: ["Sí, quiero activarlo", "¿Cuánto cuesta Hey Pro?", "Ahora no, gracias"],
          });
        } else {
          const ctx = generarContextoUC3(TRANSACCIONES_MOCK);
          const msg = generarMensajeProactivoUC3(ctx);
          setUC3Payload(msg);
        }
        setShowUC3(true);
      }
    }, 2200);
    return () => clearTimeout(t);
  }, [isConnected, uc3, tiene_hey_pro, userName]);

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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View>
              <Text style={{ color: D.textMuted, fontSize: 12 }}>{getGreeting()}</Text>
              <Text style={{ color: D.text, fontSize: 22, fontWeight: "700", marginTop: 1 }}>
                {userName}
              </Text>
            </View>
            {/* Pipeline connection indicator */}
            {!contextLoading && (
              <View style={{
                width: 7, height: 7, borderRadius: 3.5,
                backgroundColor: isConnected ? D.success : D.textMuted,
                marginTop: 2,
              }} />
            )}
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

        {/* ── Balance Card — premium ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}>
          <View style={{
            backgroundColor: "#161616",
            borderRadius: 24,
            padding: 22,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: "rgba(255,255,255,0.09)",
          }}>
            {/* Top label + toggle */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={{ color: "rgba(255,255,255,0.38)", fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" }}>Saldo disponible</Text>
              <Pressable onPress={() => setShowBalance(!showBalance)} hitSlop={12}>
                <Ionicons name={showBalance ? "eye-off-outline" : "eye-outline"} size={16} color="rgba(255,255,255,0.30)" />
              </Pressable>
            </View>

            <Text style={{
              color: D.text,
              fontSize: 40,
              fontWeight: "700",
              letterSpacing: -1,
              marginBottom: 22,
            }}>
              {showBalance ? formatMXN(user.balance_actual) : "•••••"}
            </Text>

            {/* Stats row */}
            <View style={{
              flexDirection: "row",
              gap: 10,
            }}>
              <View style={{
                flex: 1, backgroundColor: "rgba(48,209,88,0.08)",
                borderRadius: 12, padding: 12,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: "rgba(48,209,88,0.18)",
              }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 5 }}>
                  <Ionicons name="arrow-down-outline" size={11} color={D.success} />
                  <Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 10 }}>Ingresos</Text>
                </View>
                <Text style={{ color: D.success, fontSize: 15, fontWeight: "700" }}>
                  {showBalance ? formatMXN(ingresoDisplay) : "••••"}
                </Text>
              </View>
              <View style={{
                flex: 1, backgroundColor: "rgba(255,255,255,0.04)",
                borderRadius: 12, padding: 12,
              }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 5 }}>
                  <Ionicons name="arrow-up-outline" size={11} color="rgba(255,255,255,0.40)" />
                  <Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 10 }}>Gastos del mes</Text>
                </View>
                <Text style={{ color: D.text, fontSize: 15, fontWeight: "700" }}>
                  {showBalance ? formatMXN(gastoDisplay) : "••••"}
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
              backgroundColor: pressed ? "rgba(255,69,58,0.10)" : "rgba(255,69,58,0.06)",
              borderRadius: 16,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: "rgba(255,69,58,0.28)",
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              overflow: "hidden",
            })}
          >
            <View style={{
              width: 32, height: 32, borderRadius: 10,
              backgroundColor: "rgba(255,69,58,0.12)",
              alignItems: "center", justifyContent: "center",
            }}>
              <Ionicons name="warning" size={16} color={D.error} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: D.text, fontSize: 13, fontWeight: "600" }} numberOfLines={1}>
                {urgentAlert.titulo}
              </Text>
              <MarkdownText
                text={urgentAlert.mensaje}
                style={{ color: "rgba(255,255,255,0.42)", fontSize: 12, marginTop: 2 }}
                numberOfLines={1}
              />
            </View>
            <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.20)" />
          </Pressable>
        )}

        {/* ── UC3 Banner proactivo — premium ── */}
        {showUC3 && uc3Payload && (
          <View style={{
            marginHorizontal: 20,
            marginBottom: 16,
            backgroundColor: "#141414",
            borderRadius: 16,
            overflow: "hidden",
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: "rgba(48,209,88,0.28)",
          }}>
            {/* Top accent bar — mismo patrón que AlertCard */}
            <View style={{ height: 2, backgroundColor: D.success, opacity: 0.70 }} />

            <View style={{ padding: 14 }}>
              {/* Header row */}
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                <View style={{
                  width: 36, height: 36, borderRadius: 10,
                  backgroundColor: "rgba(48,209,88,0.10)",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Ionicons name="star-outline" size={17} color={D.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <Text style={{ color: D.text, fontSize: 14, fontWeight: "600", flex: 1 }}>
                      Cashback Hey Pro
                    </Text>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: D.success }} />
                  </View>
                  <MarkdownText
                    text={uc3Payload.text}
                    style={{ color: "rgba(255,255,255,0.50)", fontSize: 13, lineHeight: 18 }}
                  />
                  <Text style={{ color: "rgba(255,255,255,0.22)", fontSize: 11, marginTop: 5 }}>
                    Havi · Ahora
                  </Text>
                </View>
                <Pressable onPress={() => setShowUC3(false)} hitSlop={10}>
                  <Ionicons name="close" size={15} color="rgba(255,255,255,0.22)" />
                </Pressable>
              </View>

              {/* Buttons */}
              <View style={{
                flexDirection: "row",
                gap: 8,
                marginTop: 12,
                paddingTop: 12,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: "rgba(255,255,255,0.07)",
              }}>
                <Pressable
                  onPress={() => {
                    setShowUC3(false);
                    router.push({
                      pathname: "/(tabs)/chat",
                      params: { initialPrompt: "Quiero activar Hey Pro. ¿Qué necesito hacer?" },
                    });
                  }}
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
                  <Text style={{ color: D.text, fontSize: 13, fontWeight: "600" }}>Activar Hey Pro</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setShowUC3(false);
                    router.push({
                      pathname: "/(tabs)/chat",
                      params: { initialPrompt: "¿Cuánto cashback estoy perdiendo este mes por no tener Hey Pro? Quiero activarlo." },
                    });
                  }}
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
                  <Text style={{ color: "rgba(255,255,255,0.60)", fontSize: 13, fontWeight: "500" }}>Havi</Text>
                </Pressable>
              </View>
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
                  else if (a.id === "transferir") router.push("/(tabs)/transferir");
                  else if (a.id === "pagar") router.push("/(tabs)/pagos");
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
              <Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>Ver todos</Text>
            </Pressable>
          </View>

          <View style={{
            backgroundColor: "#141414",
            borderRadius: 20,
            overflow: "hidden",
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: "rgba(255,255,255,0.08)",
          }}>
            {lastTxns.map((txn, idx) => {
              const icon = CAT_ICONS[txn.categoria] ?? CAT_ICONS.default;
              const isIncome = txn.tipo === "abono";
              return (
                <View key={txn.id} style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: idx < lastTxns.length - 1 ? StyleSheet.hairlineWidth : 0,
                  borderBottomColor: "rgba(255,255,255,0.06)",
                }}>
                  <View style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    backgroundColor: "rgba(255,255,255,0.05)",
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
                    <Text style={{ color: "rgba(255,255,255,0.28)", fontSize: 11, marginTop: 2 }}>
                      {txn.categoria}
                    </Text>
                  </View>
                  <Text style={{ color: isIncome ? D.success : "rgba(255,255,255,0.80)", fontSize: 14, fontWeight: "600" }}>
                    {isIncome ? "+" : "-"}{formatMXN(txn.monto)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── UC2 Digital Twin Card — premium redesign ── */}
        <Pressable
          onPress={() => router.push({
            pathname: "/(tabs)/chat",
           params: { initialPrompt: "¿Cómo voy a terminar el mes si sigo gastando al mismo ritmo? Dime qué puedo mejorar." },
          })}
          style={({ pressed }) => ({
            marginHorizontal: 20,
            marginTop: 16,
            borderRadius: 20,
            overflow: "hidden",
            opacity: pressed ? 0.88 : 1,
          })}
        >
          {/* Dark gradient background */}
          <View style={{
            backgroundColor: "#141414",
            borderRadius: 20,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: "rgba(255,255,255,0.10)",
            overflow: "hidden",
          }}>
            {/* Top accent bar */}
            <View style={{ height: 2, backgroundColor: uc2.deficit_proyectado < 0 ? D.warning : D.success, width: "100%", opacity: 0.8 }} />

            {/* Header */}
            <View style={{
              paddingHorizontal: 18,
              paddingTop: 16,
              paddingBottom: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{
                  width: 28, height: 28, borderRadius: 8,
                  backgroundColor: "rgba(255,255,255,0.07)",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Text style={{ fontSize: 13 }}>✦</Text>
                </View>
                <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: "700", letterSpacing: 1.1, textTransform: "uppercase" }}>
                  Este mes
                </Text>
              </View>
              {contextLoading
                ? <ActivityIndicator size="small" color={D.textMuted} />
                : <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>Simula tu mes</Text>
                    <Ionicons name="chevron-forward" size={12} color="rgba(255,255,255,0.25)" />
                  </View>
              }
            </View>

            {/* Stats — two columns */}
            <View style={{ flexDirection: "row", paddingHorizontal: 18, paddingBottom: 16, gap: 12 }}>
              <View style={{
                flex: 1, backgroundColor: "rgba(255,255,255,0.04)",
                borderRadius: 12, padding: 14,
              }}>
                <Text style={{ color: "rgba(255,255,255,0.40)", fontSize: 10, marginBottom: 6, letterSpacing: 0.3 }}>Proyección fin de mes</Text>
                <Text style={{
                  color: uc2.gasto_estimado_fin_mes > uc2.ingreso_mensual ? D.warning : D.text,
                  fontSize: 20, fontWeight: "700", letterSpacing: -0.5,
                }}>
                  {showBalance ? formatMXN(uc2.gasto_estimado_fin_mes) : "••••"}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.28)", fontSize: 10, marginTop: 4 }}>
                  vs {showBalance ? formatMXN(uc2.ingreso_mensual) : "••••"} ingreso
                </Text>
              </View>
              <View style={{
                flex: 1,
                backgroundColor: uc2.deficit_proyectado < 0
                  ? "rgba(255,69,58,0.08)" : "rgba(48,209,88,0.08)",
                borderRadius: 12, padding: 14,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: uc2.deficit_proyectado < 0
                  ? "rgba(255,69,58,0.20)" : "rgba(48,209,88,0.20)",
              }}>
                <Text style={{ color: "rgba(255,255,255,0.40)", fontSize: 10, marginBottom: 6, letterSpacing: 0.3 }}>
                  {uc2.deficit_proyectado < 0 ? "Déficit estimado" : "Restante"}
                </Text>
                <Text style={{
                  color: uc2.deficit_proyectado < 0 ? D.error : D.success,
                  fontSize: 20, fontWeight: "700", letterSpacing: -0.5,
                }}>
                  {showBalance
                    ? (uc2.deficit_proyectado < 0 ? "-" : "+") + formatMXN(Math.abs(uc2.deficit_proyectado))
                    : "••••"}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.28)", fontSize: 10, marginTop: 4 }}>
                  {uc2.dias_al_corte > 0 ? `Corte en ${uc2.dias_al_corte} días` : "Zona de riesgo"}
                </Text>
              </View>
            </View>

            {/* Insight footer */}
            {!contextLoading && (
              <View style={{
                marginHorizontal: 18, marginBottom: 16,
                flexDirection: "row", alignItems: "center", gap: 8,
              }}>
                <Ionicons
                  name={uc2.zona_riesgo === "Saludable" ? "checkmark-circle" : "alert-circle"}
                  size={14}
                  color={uc2.zona_riesgo === "Saludable" ? D.success : D.warning}
                />
                <Text style={{ color: "rgba(255,255,255,0.50)", fontSize: 12, lineHeight: 17, flex: 1 }}>
                  {isConnected
                    ? `Zona ${uc2.zona_riesgo} · Tendencia ${uc2.tendencia_riesgo}. Toca para simular.`
                    : `Categoría problema: ${uc2.categoria_problema}. Toca para simular.`}
                </Text>
              </View>
            )}
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
  { id: "havi", icon: "sparkles-outline", label: "Havi" },
];

function QuickAction({ icon, label, onPress }: { icon: string; label: string; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ alignItems: "center", opacity: pressed ? 0.55 : 1 })}
    >
      <View style={{
        width: 56,
        height: 56,
        borderRadius: 18,
        backgroundColor: "#161616",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 7,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.09)",
      }}>
        <Ionicons name={icon as any} size={22} color="rgba(255,255,255,0.75)" />
      </View>
      <Text style={{ color: "rgba(255,255,255,0.42)", fontSize: 11, letterSpacing: 0.1 }}>{label}</Text>
    </Pressable>
  );
}

