// ============================================================
// PROFILE — Obsidian Intelligence dark mode
// ============================================================

import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import Svg, { Circle, G, Text as SvgText } from "react-native-svg";
import { DEMO_USER, formatMXN } from "../../src/data/mockData";

const D = {
  bg: "#07090E",
  surface: "#0F1318",
  card: "#161B27",
  cardAlt: "#1C2235",
  border: "rgba(255,255,255,0.07)",
  borderAccent: "rgba(6,182,212,0.18)",
  text: "#EFF6FF",
  textSub: "rgba(239,246,255,0.55)",
  textMuted: "rgba(239,246,255,0.30)",
  accent: "#06B6D4",
  accentDeep: "#0891B2",
  success: "#4ADE80",
  warning: "#FBBF24",
  error: "#F87171",
  indigo: "#818CF8",
};

const GASTO_CATS = [
  { label: "Restaurantes", pct: 32, color: "#06B6D4" },
  { label: "Supermercado", pct: 25, color: "#818CF8" },
  { label: "Transporte", pct: 18, color: "#4ADE80" },
  { label: "Entretenimiento", pct: 15, color: "#FBBF24" },
  { label: "Otros", pct: 10, color: "#F87171" },
];

function DonutChart({ size = 160 }: { size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.36;
  const stroke = size * 0.13;
  const circumference = 2 * Math.PI * r;

  let cumulative = 0;
  const segments = GASTO_CATS.map((cat) => {
    const dashArray = (cat.pct / 100) * circumference;
    const dashOffset = circumference - (cumulative * circumference) / 100;
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
            strokeLinecap="round"
          />
        ))}
      </G>
      <SvgText x={cx} y={cy - 6} textAnchor="middle" fill="#EFF6FF" fontSize={size * 0.09} fontWeight="700">
        Gastos
      </SvgText>
      <SvgText x={cx} y={cy + 11} textAnchor="middle" fill="rgba(239,246,255,0.4)" fontSize={size * 0.075}>
        mes
      </SvgText>
    </Svg>
  );
}

const MENU = [
  { icon: "card-outline", label: "Mis productos", sub: "Cuenta, tarjetas y más" },
  { icon: "shield-checkmark-outline", label: "Seguridad", sub: "Contraseña, biometría, PIN" },
  { icon: "help-circle-outline", label: "Ayuda", sub: "Preguntas frecuentes" },
  { icon: "document-text-outline", label: "Términos y privacidad", sub: "Aviso de privacidad" },
];

export default function ProfileScreen() {
  const user = DEMO_USER;
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
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 }}>
          <Text style={{ color: D.text, fontSize: 24, fontWeight: "800" }}>Mi cuenta</Text>
        </View>

        {/* User card */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={{
            backgroundColor: D.card,
            borderRadius: 22,
            padding: 20,
            borderWidth: 1,
            borderColor: D.border,
            overflow: "hidden",
          }}>
            {/* Glow */}
            <View style={{
              position: "absolute",
              top: -30,
              right: -20,
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: "rgba(6,182,212,0.05)",
            }} />

            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <LinearGradient
                colors={["#06B6D4", "#818CF8", "#A855F7"]}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "#fff", fontSize: 24, fontWeight: "800" }}>
                  {user.nombre[0]}
                </Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={{ color: D.text, fontSize: 20, fontWeight: "700" }}>
                  {user.nombre} {user.apellido}
                </Text>
                <Text style={{ color: D.textMuted, fontSize: 12, marginTop: 2 }}>
                  {user.user_id}
                </Text>
                <View style={{
                  marginTop: 7,
                  alignSelf: "flex-start",
                  backgroundColor: user.tiene_hey_pro ? "rgba(6,182,212,0.10)" : D.surface,
                  borderRadius: 8,
                  paddingHorizontal: 9,
                  paddingVertical: 4,
                  borderWidth: 1,
                  borderColor: user.tiene_hey_pro ? "rgba(6,182,212,0.20)" : D.border,
                }}>
                  <Text style={{
                    color: user.tiene_hey_pro ? D.accent : D.textMuted,
                    fontSize: 11,
                    fontWeight: "700",
                    letterSpacing: 0.5,
                  }}>
                    {user.tiene_hey_pro ? "⚡ HEY PRO" : "Hey Free"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Hey Pro CTA */}
        {!user.tiene_hey_pro && (
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <Pressable
              onPress={() => router.push("/(tabs)/chat")}
              style={({ pressed }) => ({
                borderRadius: 16,
                overflow: "hidden",
                opacity: pressed ? 0.85 : 1,
                transform: pressed ? [{ scale: 0.98 }] : [],
              })}
            >
              <LinearGradient
                colors={["#06B6D4", "#818CF8"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  paddingVertical: 14,
                  paddingHorizontal: 20,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>
                  ⚡ Activar Hey Pro — gana cashback
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        )}

        {/* Stats grid */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <StatBlock
              label="Saldo"
              value={formatMXN(user.balance_actual)}
              color={D.success}
            />
            <StatBlock
              label="Ingresos"
              value={formatMXN(user.ingreso_mensual)}
              color={D.accent}
            />
            <StatBlock
              label="Gastos"
              value={formatMXN(user.gasto_acumulado_mes)}
              color={D.text}
            />
          </View>
        </View>

        {/* Donut chart */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={{
            backgroundColor: D.card,
            borderRadius: 20,
            padding: 20,
            borderWidth: 1,
            borderColor: D.border,
          }}>
            <Text style={{ color: D.text, fontSize: 15, fontWeight: "700", marginBottom: 16 }}>
              Distribución de gastos
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <DonutChart size={140} />
              <View style={{ flex: 1, gap: 8 }}>
                {GASTO_CATS.map((cat) => (
                  <View key={cat.label} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: cat.color }} />
                    <Text style={{ color: D.textSub, fontSize: 12, flex: 1 }}>{cat.label}</Text>
                    <Text style={{ color: D.text, fontSize: 12, fontWeight: "700" }}>{cat.pct}%</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Notifications toggle */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={{
            backgroundColor: D.card,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: D.border,
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
          }}>
            <View style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              backgroundColor: notifEnabled ? "rgba(6,182,212,0.10)" : D.surface,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: notifEnabled ? "rgba(6,182,212,0.20)" : D.border,
            }}>
              <Ionicons
                name={notifEnabled ? "notifications" : "notifications-off-outline"}
                size={17}
                color={notifEnabled ? D.accent : D.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: D.text, fontSize: 14, fontWeight: "600" }}>
                Alertas de Havi
              </Text>
              <Text style={{ color: D.textMuted, fontSize: 12, marginTop: 1 }}>
                {notifEnabled ? "Activas" : "Desactivadas"}
              </Text>
            </View>
            <Switch
              value={notifEnabled}
              onValueChange={setNotifEnabled}
              trackColor={{ false: D.surface, true: "rgba(6,182,212,0.35)" }}
              thumbColor={notifEnabled ? D.accent : D.textMuted}
            />
          </View>
        </View>

        {/* Menu items */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={{
            backgroundColor: D.card,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: D.border,
            overflow: "hidden",
          }}>
            {MENU.map((item, idx) => (
              <Pressable
                key={idx}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 18,
                  paddingVertical: 15,
                  backgroundColor: pressed ? D.cardAlt : "transparent",
                  borderBottomWidth: idx < MENU.length - 1 ? 1 : 0,
                  borderBottomColor: D.border,
                  gap: 14,
                })}
              >
                <View style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: D.surface,
                  borderWidth: 1,
                  borderColor: D.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Ionicons name={item.icon as any} size={16} color={D.textSub} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: D.text, fontSize: 14, fontWeight: "600" }}>{item.label}</Text>
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
            backgroundColor: pressed ? "rgba(248,113,113,0.06)" : "transparent",
            borderRadius: 14,
            paddingVertical: 14,
            alignItems: "center",
            borderWidth: 1,
            borderColor: "rgba(248,113,113,0.15)",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
          })}>
            <Ionicons name="log-out-outline" size={16} color={D.error} />
            <Text style={{ color: D.error, fontSize: 14, fontWeight: "600" }}>Cerrar sesión</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBlock({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{
      flex: 1,
      backgroundColor: D.card,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: D.border,
      alignItems: "flex-start",
    }}>
      <Text style={{ color: D.textMuted, fontSize: 11, marginBottom: 6 }}>{label}</Text>
      <Text style={{ color, fontSize: 13, fontWeight: "700" }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}
