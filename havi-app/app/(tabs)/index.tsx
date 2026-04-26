// ============================================================
// HOME — Dashboard principal — Light mode fintech profesional
// Cashback: informativo, jerarquía secundaria
// ============================================================

import React, { useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
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
import { Transaccion } from "../../src/types";
import { AppCard, SectionHeader, GradientButton } from "../../components/ui";

// ── Paleta light mode fintech ────────────────────────────────
const C = {
  bg: "#FFFFFF",
  surface: "#FAFAFA",
  card: "#FFFFFF",
  border: "#F0F0F0",
  borderAlt: "#E5E7EB",
  textPrimary: "#111111",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  accent: "#6D5EF8",       // morado azulado sobrio — CTA principal
  accentLight: "#EEF2FF",  // fondo acento suave
  blue: "#3B82F6",
  green: "#10B981",
  rose: "#F43F5E",
  amber: "#F59E0B",
  error: "#EF4444",
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

  useEffect(() => {
    const urgente = alerts.find((a) => !a.leida && a.priority === "alta");
    if (urgente) {
      const timer = setTimeout(() => showAlert(urgente), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const alertasPendientes = alerts.filter((a) => !a.accionada);
  const spendRatio = Math.min((user.gasto_acumulado_mes / user.ingreso_mensual) * 100, 100);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* ── Header ── */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 20,
          }}
        >
          <View>
            <Text style={{ color: C.textMuted, fontSize: 13 }}>Bienvenida de vuelta</Text>
            <Text style={{ color: C.textPrimary, fontSize: 22, fontWeight: "700" }}>
              {user.nombre} 👋
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/(tabs)/alerts")}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: pressed ? C.borderAlt : C.surface,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: C.border,
            })}
          >
            <Ionicons name="notifications-outline" size={18} color={C.textSecondary} />
            {unreadCount > 0 && (
              <View
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  width: 7,
                  height: 7,
                  borderRadius: 3.5,
                  backgroundColor: C.error,
                }}
              />
            )}
          </Pressable>
        </View>

        {/* ── Balance Card — Hero principal (gradiente suave morado/azul) ── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <LinearGradient
            colors={["#6D5EF8", "#9D8FF8", "#B8AFF9"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 24,
              padding: 24,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Círculos decorativos muy sutiles */}
            <View
              style={{
                position: "absolute",
                width: 180,
                height: 180,
                borderRadius: 90,
                backgroundColor: "rgba(255,255,255,0.08)",
                top: -50,
                right: -40,
              }}
            />
            <View
              style={{
                position: "absolute",
                width: 110,
                height: 110,
                borderRadius: 55,
                backgroundColor: "rgba(255,255,255,0.05)",
                bottom: -25,
                right: 60,
              }}
            />

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 20,
              }}
            >
              <View>
                <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 13 }}>
                  Balance disponible
                </Text>
                <Text
                  style={{ color: "#fff", fontSize: 36, fontWeight: "800", marginTop: 4 }}
                >
                  {formatMXN(user.balance_actual)}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: "rgba(255,255,255,0.18)",
                  borderRadius: 14,
                  padding: 10,
                }}
              >
                <Ionicons name="card-outline" size={22} color="#fff" />
              </View>
            </View>

            <Text
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: 14,
                letterSpacing: 3,
                marginBottom: 16,
                fontWeight: "500",
              }}
            >
              •••• •••• •••• 4821
            </Text>

            <View style={{ flexDirection: "row", gap: 24 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View
                  style={{
                    backgroundColor: "rgba(255,255,255,0.18)",
                    borderRadius: 8,
                    padding: 5,
                  }}
                >
                  <Ionicons name="arrow-down-outline" size={13} color="#fff" />
                </View>
                <View>
                  <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 11 }}>Ingresos</Text>
                  <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>
                    {formatMXN(user.ingreso_mensual)}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View
                  style={{
                    backgroundColor: "rgba(255,255,255,0.18)",
                    borderRadius: 8,
                    padding: 5,
                  }}
                >
                  <Ionicons name="arrow-up-outline" size={13} color="#fff" />
                </View>
                <View>
                  <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 11 }}>Gastos</Text>
                  <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>
                    {formatMXN(user.gasto_acumulado_mes)}
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* ── Quick Actions ── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {QUICK_ACTIONS.map((action) => (
              <QuickAction
                key={action.id}
                icon={action.icon}
                label={action.label}
                accent={action.accent}
                onPress={() => {
                  if (action.id === "havi") router.push("/(tabs)/chat");
                  else if (action.id === "alertas") router.push("/(tabs)/alerts");
                }}
              />
            ))}
          </View>
        </View>

        {/* ── Alertas pendientes ── */}
        {alertasPendientes.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
            <SectionHeader title="Requieren atención" />
            <View style={{ gap: 10 }}>
              {alertasPendientes.slice(0, 2).map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onPress={() => showAlert(alert)}
                />
              ))}
            </View>
          </View>
        )}

        {/* ── Gastos del mes ── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <AppCard>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16 }}>
              <Text style={{ color: C.textPrimary, fontSize: 16, fontWeight: "700" }}>
                Gastos del mes
              </Text>
              <Pressable onPress={() => router.push("/(tabs)/chat")}>
                <Text style={{ color: C.accent, fontSize: 13, fontWeight: "600" }}>
                  Analizar con Havi
                </Text>
              </Pressable>
            </View>

            {/* Barra progreso */}
            <View
              style={{
                backgroundColor: "#F3F4F6",
                borderRadius: 6,
                height: 8,
                overflow: "hidden",
                marginBottom: 8,
              }}
            >
              <LinearGradient
                colors={spendRatio > 80 ? [C.rose, C.error] : [C.accent, "#9D8FF8"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ height: 8, borderRadius: 6, width: `${spendRatio}%` }}
              />
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 14 }}>
              <Text style={{ color: spendRatio > 80 ? C.rose : C.accent, fontSize: 13, fontWeight: "600" }}>
                {formatMXN(user.gasto_acumulado_mes)} gastados
              </Text>
              <Text style={{ color: C.textMuted, fontSize: 13 }}>
                de {formatMXN(user.ingreso_mensual)}
              </Text>
            </View>

            <View
              style={{
                paddingTop: 12,
                borderTopWidth: 1,
                borderTopColor: C.border,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Ionicons name="trending-up-outline" size={15} color={C.amber} />
              <Text style={{ color: C.textSecondary, fontSize: 13 }}>
                Proyección fin de mes:{" "}
                <Text style={{ color: C.amber, fontWeight: "600" }}>
                  {formatMXN(user.gasto_estimado_fin_mes)}
                </Text>
              </Text>
            </View>
          </AppCard>
        </View>

        {/* ── Cashback — jerarquía SECUNDARIA ── */}
        <CashbackInfoStrip
          cashbackMes={UC3_MOCK.cashback_perdido_mes}
          topCategoria={UC3_MOCK.top_categoria_perdida}
          onPress={() => router.push("/(tabs)/chat")}
        />

        {/* ── Últimas transacciones ── */}
        <View style={{ paddingHorizontal: 20 }}>
          <SectionHeader
            title="Últimos movimientos"
            action="Ver con Havi"
            onAction={() => router.push("/(tabs)/chat")}
          />
          <AppCard padding={0} style={{ overflow: "hidden" }}>
            {TRANSACCIONES_MOCK.slice(0, 5).map((txn, idx) => (
              <TransactionRow
                key={txn.id}
                txn={txn}
                isLast={idx === 4}
              />
            ))}
          </AppCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── CASHBACK INFO STRIP — secundario, sin CTAs agresivas ────
function CashbackInfoStrip({
  cashbackMes,
  topCategoria,
  onPress,
}: {
  cashbackMes: number;
  topCategoria: string;
  onPress: () => void;
}) {
  const CATEGORIA_LABEL: Record<string, string> = {
    tecnologia: "Tecnología",
    restaurante: "Restaurantes",
    supermercado: "Supermercados",
    transporte: "Transporte",
    entretenimiento: "Entretenimiento",
  };
  const label = CATEGORIA_LABEL[topCategoria] ?? topCategoria;

  return (
    <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          opacity: pressed ? 0.8 : 1,
          transform: pressed ? [{ scale: 0.985 }] : [{ scale: 1 }],
        })}
      >
        <View
          style={{
            backgroundColor: C.surface,
            borderRadius: 16,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            borderWidth: 1,
            borderColor: C.border,
          }}
        >
          {/* Ícono pequeño */}
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              backgroundColor: C.accentLight,
              borderWidth: 1,
              borderColor: "rgba(109,94,248,0.15)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="star-outline" size={16} color={C.accent} />
          </View>

          {/* Texto */}
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.textMuted, fontSize: 12 }}>
              Hey Pro · cashback potencial
            </Text>
            <Text style={{ color: C.textPrimary, fontSize: 14, fontWeight: "600", marginTop: 1 }}>
              {formatMXN(cashbackMes)}/mes en {label}
            </Text>
          </View>

          {/* CTA texto link, no botón */}
          <Text style={{ color: C.accent, fontSize: 12, fontWeight: "600" }}>
            Explorar →
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

// ── COMPONENTES INTERNOS ─────────────────────────────────────

const QUICK_ACTIONS = [
  { id: "havi", icon: "chatbubble-ellipses-outline", label: "Havi", accent: C.accent },
  { id: "transferir", icon: "swap-horizontal-outline", label: "Transferir", accent: C.blue },
  { id: "pagar", icon: "receipt-outline", label: "Pagar", accent: C.green },
  { id: "alertas", icon: "shield-checkmark-outline", label: "Alertas", accent: C.amber },
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
      style={({ pressed }) => ({
        alignItems: "center",
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 18,
          backgroundColor: `${accent}12`,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: `${accent}22`,
          marginBottom: 6,
        }}
      >
        <Ionicons name={icon as any} size={22} color={accent} />
      </View>
      <Text style={{ color: C.textSecondary, fontSize: 12, fontWeight: "500" }}>{label}</Text>
    </Pressable>
  );
}

function AlertCard({ alert, onPress }: { alert: any; onPress: () => void }) {
  const isPriority = alert.priority === "alta";
  const color = isPriority ? C.error : alert.priority === "media" ? C.amber : C.green;
  const icons: Record<string, string> = {
    txn_atipica: "shield-outline",
    rechazo_saldo: "card-outline",
    rechazo_limite: "card-outline",
    cashback_proximo_perdido: "star-outline",
    upselling_pro: "star-outline",
  };
  const icon = icons[alert.type] || "notifications-outline";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? C.surface : C.card,
        borderRadius: 16,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderWidth: 1,
        borderColor: `${color}25`,
        borderLeftWidth: 3,
        borderLeftColor: color,
      })}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 11,
          backgroundColor: `${color}10`,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon as any} size={17} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.textPrimary, fontSize: 14, fontWeight: "600", marginBottom: 2 }}>
          {alert.titulo}
        </Text>
        <Text style={{ color: C.textSecondary, fontSize: 12 }} numberOfLines={1}>
          {alert.mensaje}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={15} color={C.textMuted} />
    </Pressable>
  );
}

function TransactionRow({ txn, isLast }: { txn: Transaccion; isLast: boolean }) {
  const icon = CATEGORIA_ICONS[txn.categoria] || CATEGORIA_ICONS.default;
  const isIncome = txn.tipo === "abono";

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: C.border,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: txn.es_anomala ? "rgba(239,68,68,0.08)" : C.surface,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
          borderWidth: txn.es_anomala ? 1 : 0,
          borderColor: txn.es_anomala ? "rgba(239,68,68,0.2)" : "transparent",
        }}
      >
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Text style={{ color: C.textPrimary, fontSize: 14, fontWeight: "600" }}>
            {txn.comercio}
          </Text>
          {txn.es_anomala && (
            <Ionicons name="warning-outline" size={12} color={C.error} />
          )}
        </View>
        <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 1 }}>{txn.categoria}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text
          style={{
            color: isIncome ? C.green : C.textPrimary,
            fontSize: 14,
            fontWeight: "700",
          }}
        >
          {isIncome ? "+" : "-"}{formatMXN(txn.monto)}
        </Text>
        <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>
          {timeAgo(txn.fecha)}
        </Text>
      </View>
    </View>
  );
}
