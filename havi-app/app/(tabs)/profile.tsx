// ============================================================
// PROFILE — Hey Banco neutral dark
// ============================================================

import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Switch, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Circle, G, Text as SvgText } from "react-native-svg";
import { DEMO_USERS, formatMXN } from "../../src/data/mockData";
import { useHaviContext } from "../../src/hooks/useHaviContext";

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

const GASTO_CATS = [
  { label: "Restaurantes", pct: 32, color: "#FFFFFF" },
  { label: "Supermercado", pct: 25, color: "rgba(255,255,255,0.70)" },
  { label: "Transporte", pct: 18, color: "#30D158" },
  { label: "Entretenimiento", pct: 15, color: "#FF9F0A" },
  { label: "Otros", pct: 10, color: "rgba(255,255,255,0.35)" },
];

function DonutChart({ size = 150 }: { size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.36;
  const stroke = size * 0.12;
  const circumference = 2 * Math.PI * r;
  let cum = 0;
  const segs = GASTO_CATS.map((cat) => {
    const da = (cat.pct / 100) * circumference;
    const off = circumference - (cum * circumference) / 100;
    cum += cat.pct;
    return { ...cat, da, off };
  });
  return (
    <Svg width={size} height={size}>
      <G rotation="-90" origin={`${cx}, ${cy}`}>
        {segs.map((seg, i) => (
          <Circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={stroke}
            strokeDasharray={`${seg.da} ${circumference - seg.da}`}
            strokeDashoffset={-(circumference - seg.off)}
          />
        ))}
      </G>
      <SvgText x={cx} y={cy - 5} textAnchor="middle" fill="#FFFFFF" fontSize={size * 0.085} fontWeight="600">Gastos</SvgText>
      <SvgText x={cx} y={cy + 12} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize={size * 0.072}>mes</SvgText>
    </Svg>
  );
}

const MENU = [
  { icon: "card-outline", label: "Mis productos", sub: "Cuenta, tarjetas y más" },
  { icon: "shield-checkmark-outline", label: "Seguridad", sub: "Contraseña, biometría, PIN" },
  { icon: "help-circle-outline", label: "Ayuda", sub: "Preguntas frecuentes" },
  { icon: "document-text-outline", label: "Términos y privacidad", sub: "Aviso de privacidad" },
];

const UC_LABELS: Record<string, string> = {
  "USR-15022": "Mix de casos (Default)",
  "USR-05719": "Rechazo cubierto por inversión (UC1)",
  "USR-03688": "Tensión financiera (UC2)",
  "USR-07552": "Cashback perdido / Upselling (UC3)",
  "USR-11034": "Prevención de fraude (UC4)"
};

export default function ProfileScreen() {
  const { switchUser, userId } = useHaviContext();
  // El profile siempre debe reflejar el usuario actual
  const user = DEMO_USERS.find(u => u.user_id === userId) || DEMO_USERS[0];
  const router = useRouter();
  const [notifEnabled, setNotifEnabled] = useState(true);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: D.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 18 }}>
          <Text style={{ color: D.text, fontSize: 24, fontWeight: "700" }}>Mi cuenta</Text>
        </View>

        {/* User card */}
        <View style={{ paddingHorizontal: 20, marginBottom: 14 }}>
          <View style={{ backgroundColor: D.card, borderRadius: 18, padding: 18 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <View style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: D.surface,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: D.sep,
              }}>
                <Text style={{ color: D.text, fontSize: 22, fontWeight: "700" }}>
                  {user.nombre[0]}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: D.text, fontSize: 18, fontWeight: "600" }}>
                  {user.nombre} {user.apellido}
                </Text>

                <View style={{
                  marginTop: 7,
                  alignSelf: "flex-start",
                  backgroundColor: user.tiene_hey_pro ? "rgba(48,209,88,0.08)" : D.surface,
                  borderRadius: 7,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: user.tiene_hey_pro ? "rgba(48,209,88,0.18)" : D.sep,
                }}>
                  <Text style={{
                    color: user.tiene_hey_pro ? D.success : D.textMuted,
                    fontSize: 11,
                    fontWeight: "600",
                  }}>
                    {user.tiene_hey_pro ? "⚡ HEY PRO" : "Hey Free"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Demo User Switcher */}
        <View style={{ paddingHorizontal: 20, marginBottom: 14 }}>
          <View style={{ backgroundColor: D.card, borderRadius: 16, overflow: "hidden", paddingVertical: 8 }}>
            <Text style={{ color: D.textMuted, fontSize: 11, fontWeight: "600", marginLeft: 16, marginBottom: 8, marginTop: 4 }}>
              CAMBIAR PERFIL (DEMO)
            </Text>
            {DEMO_USERS.map((u, idx) => {
              const isSelected = u.user_id === user.user_id;
              return (
                <Pressable
                  key={u.user_id}
                  onPress={() => switchUser(u)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    backgroundColor: pressed ? D.cardAlt : (isSelected ? "rgba(48,209,88,0.05)" : "transparent"),
                    borderBottomWidth: idx < DEMO_USERS.length - 1 ? StyleSheet.hairlineWidth : 0,
                    borderBottomColor: D.sep,
                    gap: 12,
                  })}
                >
                  <View style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: isSelected ? D.success : D.surface,
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    {isSelected && <Ionicons name="checkmark" size={16} color="#000" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: isSelected ? D.success : D.text, fontSize: 14, fontWeight: "500" }}>
                      {u.nombre} {u.apellido}
                    </Text>
                    <Text style={{ color: D.textMuted, fontSize: 11, marginTop: 2 }}>{u.user_id}</Text>
                    <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, marginTop: 2 }}>
                      {UC_LABELS[u.user_id] || ""}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Hey Pro CTA */}
        {!user.tiene_hey_pro && (
          <View style={{ paddingHorizontal: 20, marginBottom: 14 }}>
            <Pressable
              onPress={() => router.push("/(tabs)/chat")}
              style={({ pressed }) => ({
                backgroundColor: pressed ? "#E5E5E5" : "#FFFFFF",
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: "center",
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Text style={{ color: "#000000", fontSize: 14, fontWeight: "700" }}>
                ⚡ Activar Hey Pro — gana cashback
              </Text>
            </Pressable>
          </View>
        )}

        {/* Stats */}
        <View style={{ paddingHorizontal: 20, marginBottom: 14 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[
              { label: "Saldo", value: formatMXN(user.balance_actual), color: D.success },
              { label: "Ingresos", value: formatMXN(user.ingreso_mensual), color: D.text },
              { label: "Gastos", value: formatMXN(user.gasto_acumulado_mes), color: D.text },
            ].map((s) => (
              <View key={s.label} style={{
                flex: 1,
                backgroundColor: D.card,
                borderRadius: 12,
                padding: 14,
              }}>
                <Text style={{ color: D.textMuted, fontSize: 11, marginBottom: 5 }}>{s.label}</Text>
                <Text style={{ color: s.color, fontSize: 13, fontWeight: "600" }} numberOfLines={1} adjustsFontSizeToFit>
                  {s.value}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Donut chart */}
        <View style={{ paddingHorizontal: 20, marginBottom: 14 }}>
          <View style={{ backgroundColor: D.card, borderRadius: 18, padding: 18 }}>
            <Text style={{ color: D.text, fontSize: 15, fontWeight: "600", marginBottom: 14 }}>
              Distribución de gastos
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <DonutChart size={130} />
              <View style={{ flex: 1, gap: 8 }}>
                {GASTO_CATS.map((cat) => (
                  <View key={cat.label} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: cat.color }} />
                    <Text style={{ color: D.textSub, fontSize: 12, flex: 1 }}>{cat.label}</Text>
                    <Text style={{ color: D.text, fontSize: 12, fontWeight: "600" }}>{cat.pct}%</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Notifications toggle */}
        <View style={{ paddingHorizontal: 20, marginBottom: 14 }}>
          <View style={{ backgroundColor: D.card, borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: D.surface,
              alignItems: "center",
              justifyContent: "center",
            }}>
              <Ionicons
                name={notifEnabled ? "notifications" : "notifications-off-outline"}
                size={16}
                color={notifEnabled ? D.text : D.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: D.text, fontSize: 14, fontWeight: "500" }}>Alertas de Havi</Text>
              <Text style={{ color: D.textMuted, fontSize: 12, marginTop: 1 }}>
                {notifEnabled ? "Activas" : "Desactivadas"}
              </Text>
            </View>
            <Switch
              value={notifEnabled}
              onValueChange={setNotifEnabled}
              trackColor={{ false: D.cardAlt, true: "rgba(48,209,88,0.4)" }}
              thumbColor={notifEnabled ? D.success : D.textMuted}
            />
          </View>
        </View>

        {/* Menu */}
        <View style={{ paddingHorizontal: 20, marginBottom: 14 }}>
          <View style={{ backgroundColor: D.card, borderRadius: 16, overflow: "hidden" }}>
            {MENU.map((item, idx) => (
              <Pressable
                key={idx}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  backgroundColor: pressed ? D.cardAlt : "transparent",
                  borderBottomWidth: idx < MENU.length - 1 ? StyleSheet.hairlineWidth : 0,
                  borderBottomColor: D.sep,
                  gap: 12,
                })}
              >
                <View style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  backgroundColor: D.surface,
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Ionicons name={item.icon as any} size={16} color={D.textSub} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: D.text, fontSize: 14, fontWeight: "500" }}>{item.label}</Text>
                  <Text style={{ color: D.textMuted, fontSize: 12, marginTop: 1 }}>{item.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={D.textMuted} />
              </Pressable>
            ))}
          </View>
        </View>

        {/* Logout */}
        <View style={{ paddingHorizontal: 20 }}>
          <Pressable style={({ pressed }) => ({
            backgroundColor: pressed ? D.card : "transparent",
            borderRadius: 14,
            paddingVertical: 14,
            alignItems: "center",
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: "rgba(255,69,58,0.20)",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
          })}>
            <Ionicons name="log-out-outline" size={16} color={D.error} />
            <Text style={{ color: D.error, fontSize: 14, fontWeight: "500" }}>Cerrar sesión</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
