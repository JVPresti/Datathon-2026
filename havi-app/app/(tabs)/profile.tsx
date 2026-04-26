// ============================================================
// PROFILE SCREEN — Light mode fintech profesional
// Incluye: toggle notificaciones, donut chart de gastos (mock SVG)
// ============================================================

import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import Svg, { Circle, G, Text as SvgText } from "react-native-svg";
import { DEMO_USER, formatMXN } from "../../src/data/mockData";
import { AppCard, SectionHeader, GradientButton } from "../../components/ui";

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
  accentDeep: "#5848E0",
  accentLight: "#EEF2FF",
  blue: "#3B82F6",
  green: "#10B981",
  rose: "#F43F5E",
  amber: "#F59E0B",
};

// ── Donut chart — gasto por categoría (mock) ──────────────────
const GASTO_CATEGORIAS = [
  { label: "Restaurantes", pct: 32, color: "#6D5EF8" },
  { label: "Supermercado", pct: 25, color: "#3B82F6" },
  { label: "Transporte", pct: 18, color: "#10B981" },
  { label: "Entretenimiento", pct: 15, color: "#F59E0B" },
  { label: "Otros", pct: 10, color: "#F43F5E" },
];

function DonutChart({ size = 160 }: { size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.36;
  const stroke = size * 0.13;
  const circumference = 2 * Math.PI * r;

  let cumulative = 0;
  const segments = GASTO_CATEGORIAS.map((cat) => {
    const dashArray = (cat.pct / 100) * circumference;
    const dashOffset = circumference - cumulative * circumference / 100;
    cumulative += cat.pct;
    return { ...cat, dashArray, dashOffset };
  });

  return (
    <Svg width={size} height={size}>
      <G rotation="-90" origin={`${cx}, ${cy}`}>
        {segments.map((seg, i) => (
          <Circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={stroke}
            strokeDasharray={`${seg.dashArray} ${circumference - seg.dashArray}`}
            strokeDashoffset={-(circumference - seg.dashOffset)}
          />
        ))}
      </G>
      {/* Centro */}
      <SvgText
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        fill="#111111"
        fontSize={size * 0.1}
        fontWeight="700"
      >
        Gastos
      </SvgText>
      <SvgText
        x={cx}
        y={cy + 12}
        textAnchor="middle"
        fill="#9CA3AF"
        fontSize={size * 0.08}
      >
        mes
      </SvgText>
    </Svg>
  );
}

const MENU_ITEMS = [
  { icon: "card-outline", label: "Mis productos", subtitle: "Cuenta, tarjetas y más" },
  { icon: "shield-checkmark-outline", label: "Seguridad", subtitle: "Contraseña, biometría, PIN" },
  { icon: "help-circle-outline", label: "Ayuda", subtitle: "Preguntas frecuentes" },
  { icon: "document-text-outline", label: "Términos y privacidad", subtitle: "Aviso de privacidad" },
];

export default function ProfileScreen() {
  const user = DEMO_USER;
  const router = useRouter();
  const [notifEnabled, setNotifEnabled] = useState(true);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 }}>
          <Text style={{ color: C.textPrimary, fontSize: 24, fontWeight: "800" }}>Mi cuenta</Text>
        </View>

        {/* Avatar card */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <AppCard>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <LinearGradient
                colors={[C.accentDeep, C.accent]}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: C.accent,
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.2,
                  shadowRadius: 6,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 26, fontWeight: "800" }}>
                  {user.nombre[0]}
                </Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.textPrimary, fontSize: 20, fontWeight: "700" }}>
                  {user.nombre} {user.apellido}
                </Text>
                <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 2 }}>
                  {user.user_id}
                </Text>
                {user.tiene_hey_pro ? (
                  <View
                    style={{
                      backgroundColor: C.accentLight,
                      borderRadius: 8,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      marginTop: 6,
                      alignSelf: "flex-start",
                      borderWidth: 1,
                      borderColor: "rgba(109,94,248,0.2)",
                    }}
                  >
                    <Text style={{ color: C.accent, fontSize: 11, fontWeight: "700" }}>
                      ⚡ HEY PRO
                    </Text>
                  </View>
                ) : (
                  <View
                    style={{
                      backgroundColor: "#F3F4F6",
                      borderRadius: 8,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      marginTop: 6,
                      alignSelf: "flex-start",
                      borderWidth: 1,
                      borderColor: C.border,
                    }}
                  >
                    <Text style={{ color: C.textMuted, fontSize: 11, fontWeight: "600" }}>
                      Hey Free
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </AppCard>
        </View>

        {/* Hey Pro promo — si no lo tiene (subtle) */}
        {!user.tiene_hey_pro && (
          <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            <GradientButton
              label="⚡  Activar Hey Pro — gana cashback"
              onPress={() => router.push("/(tabs)/chat")}
              variant="purple"
              size="md"
            />
          </View>
        )}

        {/* Donut chart — distribución de gastos */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <AppCard>
            <SectionHeader title="Distribución de gastos" />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
              <DonutChart size={150} />
              <View style={{ flex: 1, gap: 8 }}>
                {GASTO_CATEGORIAS.map((cat) => (
                  <View key={cat.label} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: cat.color,
                      }}
                    />
                    <Text style={{ color: C.textSecondary, fontSize: 12, flex: 1 }}>
                      {cat.label}
                    </Text>
                    <Text style={{ color: C.textPrimary, fontSize: 12, fontWeight: "700" }}>
                      {cat.pct}%
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </AppCard>
        </View>

        {/* Resumen financiero */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <AppCard>
            <SectionHeader title="Resumen de cuenta" />
            <View style={{ gap: 14 }}>
              <SummaryRow
                label="Balance disponible"
                value={formatMXN(user.balance_actual)}
                valueColor={C.green}
              />
              <View style={{ height: 1, backgroundColor: C.border }} />
              <SummaryRow
                label="Gasto acumulado (mes)"
                value={formatMXN(user.gasto_acumulado_mes)}
                valueColor={C.textPrimary}
              />
              <View style={{ height: 1, backgroundColor: C.border }} />
              <SummaryRow
                label="Ingreso mensual"
                value={formatMXN(user.ingreso_mensual)}
                valueColor={C.textPrimary}
              />
            </View>
          </AppCard>
        </View>

        {/* Notificaciones toggle */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <AppCard>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: notifEnabled ? C.accentLight : "#F3F4F6",
                  borderWidth: 1,
                  borderColor: notifEnabled ? "rgba(109,94,248,0.2)" : C.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name={notifEnabled ? "notifications" : "notifications-off-outline"}
                  size={18}
                  color={notifEnabled ? C.accent : C.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.textPrimary, fontSize: 14, fontWeight: "600" }}>
                  Notificaciones de Havi
                </Text>
                <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 1 }}>
                  {notifEnabled ? "Alertas activas" : "Alertas desactivadas"}
                </Text>
              </View>
              <Switch
                value={notifEnabled}
                onValueChange={setNotifEnabled}
                trackColor={{ false: C.borderAlt, true: "rgba(109,94,248,0.4)" }}
                thumbColor={notifEnabled ? C.accent : "#9CA3AF"}
              />
            </View>
          </AppCard>
        </View>

        {/* Menu items */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <AppCard padding={0} style={{ overflow: "hidden" }}>
            {MENU_ITEMS.map((item, idx) => (
              <Pressable
                key={idx}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 18,
                  paddingVertical: 16,
                  backgroundColor: pressed ? C.surface : "transparent",
                  borderBottomWidth: idx < MENU_ITEMS.length - 1 ? 1 : 0,
                  borderBottomColor: C.border,
                  gap: 14,
                })}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 11,
                    backgroundColor: C.surface,
                    borderWidth: 1,
                    borderColor: C.border,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name={item.icon as any} size={17} color={C.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.textPrimary, fontSize: 14, fontWeight: "600" }}>
                    {item.label}
                  </Text>
                  <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 1 }}>
                    {item.subtitle}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={15} color={C.textMuted} />
              </Pressable>
            ))}
          </AppCard>
        </View>

        {/* Logout */}
        <View style={{ paddingHorizontal: 20 }}>
          <Pressable
            style={({ pressed }) => ({
              backgroundColor: pressed ? "#FFF1F2" : "transparent",
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "rgba(239,68,68,0.2)",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
            })}
          >
            <Ionicons name="log-out-outline" size={17} color="#EF4444" />
            <Text style={{ color: "#EF4444", fontSize: 15, fontWeight: "600" }}>
              Cerrar sesión
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor: string;
}) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <Text style={{ color: C.textSecondary, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: valueColor, fontSize: 14, fontWeight: "700" }}>{value}</Text>
    </View>
  );
}
