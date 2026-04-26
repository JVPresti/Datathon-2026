// ============================================================
// MOVEMENTS — Obsidian Intelligence dark mode
// ============================================================

import React, { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { TRANSACCIONES_MOCK, formatMXN, timeAgo } from "../../src/data/mockData";
import { Transaccion } from "../../src/types";

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
};

type Filter = "todos" | "cargo" | "abono";

const CAT_ICONS: Record<string, string> = {
  restaurante: "🍽️",
  supermercado: "🛒",
  transporte: "🚌",
  entretenimiento: "🎬",
  tecnologia: "💻",
  ingreso: "💰",
  default: "💳",
};

export default function MovementsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("todos");

  const filtered = TRANSACCIONES_MOCK.filter((t) => filter === "todos" || t.tipo === filter);
  const totalCargos = TRANSACCIONES_MOCK.filter((t) => t.tipo === "cargo").reduce((s, t) => s + t.monto, 0);
  const totalAbonos = TRANSACCIONES_MOCK.filter((t) => t.tipo === "abono").reduce((s, t) => s + t.monto, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: D.bg }}>
      {/* Header */}
      <View style={{
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: D.border,
      }}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: pressed ? D.cardAlt : D.card,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: D.border,
          })}
        >
          <Ionicons name="chevron-back" size={18} color={D.textSub} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: D.text, fontSize: 20, fontWeight: "800" }}>Movimientos</Text>
          <Text style={{ color: D.textMuted, fontSize: 11, marginTop: 1 }}>
            {filtered.length} transacciones
          </Text>
        </View>
        <Pressable
          onPress={() => router.push("/(tabs)/chat")}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            paddingHorizontal: 12,
            paddingVertical: 7,
            backgroundColor: pressed ? "rgba(6,182,212,0.15)" : "rgba(6,182,212,0.08)",
            borderRadius: 10,
            borderWidth: 1,
            borderColor: D.borderAccent,
          })}
        >
          <Text style={{ fontSize: 11 }}>✦</Text>
          <Text style={{ color: D.accent, fontSize: 12, fontWeight: "700" }}>Analizar</Text>
        </Pressable>
      </View>

      {/* Balance summary row */}
      <View style={{ flexDirection: "row", paddingHorizontal: 20, paddingVertical: 14, gap: 10 }}>
        <View style={{
          flex: 1,
          backgroundColor: "rgba(74,222,128,0.06)",
          borderRadius: 14,
          padding: 14,
          borderWidth: 1,
          borderColor: "rgba(74,222,128,0.10)",
        }}>
          <Text style={{ color: D.textMuted, fontSize: 11 }}>Abonos</Text>
          <Text style={{ color: D.success, fontSize: 15, fontWeight: "700", marginTop: 3 }}>
            +{formatMXN(totalAbonos)}
          </Text>
        </View>
        <View style={{
          flex: 1,
          backgroundColor: "rgba(248,113,113,0.05)",
          borderRadius: 14,
          padding: 14,
          borderWidth: 1,
          borderColor: "rgba(248,113,113,0.08)",
        }}>
          <Text style={{ color: D.textMuted, fontSize: 11 }}>Cargos</Text>
          <Text style={{ color: D.error, fontSize: 15, fontWeight: "700", marginTop: 3 }}>
            -{formatMXN(totalCargos)}
          </Text>
        </View>
      </View>

      {/* Filter pills */}
      <View style={{ flexDirection: "row", paddingHorizontal: 20, gap: 8, marginBottom: 14 }}>
        {(["todos", "cargo", "abono"] as Filter[]).map((f) => {
          const active = filter === f;
          const labels: Record<Filter, string> = { todos: "Todos", cargo: "Cargos", abono: "Abonos" };
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                paddingVertical: 7,
                borderRadius: 20,
                backgroundColor: active ? D.accent : pressed ? D.cardAlt : D.card,
                borderWidth: 1,
                borderColor: active ? D.accent : D.border,
              })}
            >
              <Text style={{
                fontSize: 13,
                fontWeight: active ? "700" : "500",
                color: active ? "#fff" : D.textSub,
              }}>
                {labels[f]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Transaction list */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{
          backgroundColor: D.card,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: D.border,
          overflow: "hidden",
        }}>
          {filtered.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <Text style={{ color: D.textMuted, fontSize: 14 }}>
                Sin movimientos en este período
              </Text>
            </View>
          ) : (
            filtered.map((txn, idx) => (
              <TxnRow key={txn.id} txn={txn} isLast={idx === filtered.length - 1} />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function TxnRow({ txn, isLast }: { txn: Transaccion; isLast: boolean }) {
  const icon = CAT_ICONS[txn.categoria] ?? CAT_ICONS.default;
  const isIncome = txn.tipo === "abono";

  return (
    <View style={{
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 13,
      borderBottomWidth: isLast ? 0 : 1,
      borderBottomColor: D.border,
    }}>
      <View style={{
        width: 38,
        height: 38,
        borderRadius: 11,
        backgroundColor: txn.es_anomala ? "rgba(251,191,36,0.07)" : D.surface,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
        borderWidth: txn.es_anomala ? 1 : 0,
        borderColor: "rgba(251,191,36,0.18)",
      }}>
        <Text style={{ fontSize: 17 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Text style={{ color: D.text, fontSize: 13, fontWeight: "600" }} numberOfLines={1}>
            {txn.comercio}
          </Text>
          {txn.es_anomala && (
            <View style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: D.warning,
            }} />
          )}
        </View>
        <Text style={{ color: D.textMuted, fontSize: 11, marginTop: 2 }}>
          {txn.categoria} · {timeAgo(txn.fecha)}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={{
          color: isIncome ? D.success : D.text,
          fontSize: 14,
          fontWeight: "700",
        }}>
          {isIncome ? "+" : "-"}{formatMXN(txn.monto)}
        </Text>
      </View>
    </View>
  );
}
