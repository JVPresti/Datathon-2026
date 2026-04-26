// ============================================================
// MOVEMENTS — Hey Banco neutral dark
// ============================================================

import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { TRANSACCIONES_MOCK, formatMXN, timeAgo } from "../../src/data/mockData";
import { Transaccion } from "../../src/types";

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
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: D.sep,
      }}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: pressed ? D.card : "transparent",
            alignItems: "center",
            justifyContent: "center",
          })}
        >
          <Ionicons name="chevron-back" size={20} color={D.textSub} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: D.text, fontSize: 20, fontWeight: "700" }}>Movimientos</Text>
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
            backgroundColor: pressed ? D.cardAlt : D.card,
            borderRadius: 10,
          })}
        >
          <Text style={{ color: D.text, fontSize: 12 }}>✦</Text>
          <Text style={{ color: D.textSub, fontSize: 13 }}>Analizar</Text>
        </Pressable>
      </View>

      {/* Summary */}
      <View style={{ flexDirection: "row", paddingHorizontal: 20, paddingVertical: 12, gap: 10 }}>
        <View style={{ flex: 1, backgroundColor: D.card, borderRadius: 12, padding: 14 }}>
          <Text style={{ color: D.textMuted, fontSize: 11, marginBottom: 3 }}>Abonos</Text>
          <Text style={{ color: D.success, fontSize: 15, fontWeight: "600" }}>
            +{formatMXN(totalAbonos)}
          </Text>
        </View>
        <View style={{ flex: 1, backgroundColor: D.card, borderRadius: 12, padding: 14 }}>
          <Text style={{ color: D.textMuted, fontSize: 11, marginBottom: 3 }}>Cargos</Text>
          <Text style={{ color: D.text, fontSize: 15, fontWeight: "600" }}>
            -{formatMXN(totalCargos)}
          </Text>
        </View>
      </View>

      {/* Filter pills */}
      <View style={{ flexDirection: "row", paddingHorizontal: 20, gap: 8, marginBottom: 12 }}>
        {(["todos", "cargo", "abono"] as Filter[]).map((f) => {
          const active = filter === f;
          const labels: Record<Filter, string> = { todos: "Todos", cargo: "Cargos", abono: "Abonos" };
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 7,
                borderRadius: 18,
                backgroundColor: active ? "#FFFFFF" : D.card,
              }}
            >
              <Text style={{
                fontSize: 13,
                fontWeight: active ? "600" : "400",
                color: active ? "#000000" : D.textSub,
              }}>
                {labels[f]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ backgroundColor: D.card, borderRadius: 16, overflow: "hidden" }}>
          {filtered.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <Text style={{ color: D.textMuted, fontSize: 14 }}>Sin movimientos</Text>
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
      borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
      borderBottomColor: "rgba(255,255,255,0.08)",
    }}>
      <View style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: "#111111",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
      }}>
        <Text style={{ fontSize: 17 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "500" }} numberOfLines={1}>
            {txn.comercio}
          </Text>
          {txn.es_anomala && (
            <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#FF9F0A" }} />
          )}
        </View>
        <Text style={{ color: "rgba(255,255,255,0.30)", fontSize: 11, marginTop: 1 }}>
          {txn.categoria} · {timeAgo(txn.fecha)}
        </Text>
      </View>
      <Text style={{
        color: isIncome ? "#30D158" : "#FFFFFF",
        fontSize: 14,
        fontWeight: "600",
      }}>
        {isIncome ? "+" : "-"}{formatMXN(txn.monto)}
      </Text>
    </View>
  );
}
