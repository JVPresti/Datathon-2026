// ============================================================
// MOVEMENTS — Lista completa de transacciones
// Light mode fintech profesional — filtros simples por tipo
// ============================================================

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  TRANSACCIONES_MOCK,
  formatMXN,
  timeAgo,
} from "../../src/data/mockData";
import { Transaccion } from "../../src/types";
import { AppCard } from "../../components/ui";

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
  accentLight: "#EEF2FF",
  green: "#10B981",
  error: "#EF4444",
  amber: "#F59E0B",
};

type FilterType = "todos" | "cargo" | "abono";

const CATEGORIA_ICONS: Record<string, string> = {
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
  const [filter, setFilter] = useState<FilterType>("todos");

  const filtered = TRANSACCIONES_MOCK.filter((txn) => {
    if (filter === "todos") return true;
    return txn.tipo === filter;
  });

  const totalCargos = TRANSACCIONES_MOCK
    .filter((t) => t.tipo === "cargo")
    .reduce((sum, t) => sum + t.monto, 0);
  const totalAbonos = TRANSACCIONES_MOCK
    .filter((t) => t.tipo === "abono")
    .reduce((sum, t) => sum + t.monto, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: pressed ? C.borderAlt : C.surface,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: C.border,
          })}
        >
          <Ionicons name="chevron-back" size={18} color={C.textSecondary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.textPrimary, fontSize: 20, fontWeight: "800" }}>
            Movimientos
          </Text>
          <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 1 }}>
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
            backgroundColor: pressed ? `${C.accent}22` : C.accentLight,
            borderRadius: 10,
          })}
        >
          <Text style={{ fontSize: 11 }}>✦</Text>
          <Text style={{ color: C.accent, fontSize: 12, fontWeight: "700" }}>
            Analizar
          </Text>
        </Pressable>
      </View>

      {/* Resumen rápido */}
      <View
        style={{
          flexDirection: "row",
          paddingHorizontal: 20,
          paddingVertical: 16,
          gap: 12,
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(16,185,129,0.06)",
            borderRadius: 14,
            padding: 14,
            borderWidth: 1,
            borderColor: "rgba(16,185,129,0.12)",
          }}
        >
          <Text style={{ color: C.textMuted, fontSize: 11 }}>Abonos</Text>
          <Text style={{ color: C.green, fontSize: 16, fontWeight: "700", marginTop: 2 }}>
            +{formatMXN(totalAbonos)}
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(239,68,68,0.05)",
            borderRadius: 14,
            padding: 14,
            borderWidth: 1,
            borderColor: "rgba(239,68,68,0.10)",
          }}
        >
          <Text style={{ color: C.textMuted, fontSize: 11 }}>Cargos</Text>
          <Text style={{ color: C.error, fontSize: 16, fontWeight: "700", marginTop: 2 }}>
            -{formatMXN(totalCargos)}
          </Text>
        </View>
      </View>

      {/* Filtros pill */}
      <View
        style={{
          flexDirection: "row",
          paddingHorizontal: 20,
          gap: 8,
          marginBottom: 16,
        }}
      >
        {(["todos", "cargo", "abono"] as FilterType[]).map((f) => {
          const active = filter === f;
          const labels: Record<FilterType, string> = {
            todos: "Todos",
            cargo: "Cargos",
            abono: "Abonos",
          };
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: active
                  ? C.accent
                  : pressed
                  ? C.borderAlt
                  : C.surface,
                borderWidth: 1,
                borderColor: active ? C.accent : C.border,
              })}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: active ? "700" : "500",
                  color: active ? "#FFFFFF" : C.textSecondary,
                }}
              >
                {labels[f]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Lista */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <AppCard padding={0} style={{ overflow: "hidden" }}>
          {filtered.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <Text style={{ color: C.textMuted, fontSize: 14 }}>
                Sin movimientos en este período
              </Text>
            </View>
          ) : (
            filtered.map((txn, idx) => (
              <TransactionRow
                key={txn.id}
                txn={txn}
                isLast={idx === filtered.length - 1}
              />
            ))
          )}
        </AppCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function TransactionRow({ txn, isLast }: { txn: Transaccion; isLast: boolean }) {
  const icon = CATEGORIA_ICONS[txn.categoria] ?? CATEGORIA_ICONS.default;
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
          <Text
            style={{ color: C.textPrimary, fontSize: 14, fontWeight: "600" }}
            numberOfLines={1}
          >
            {txn.comercio}
          </Text>
          {txn.es_anomala && (
            <Ionicons name="warning-outline" size={12} color={C.error} />
          )}
        </View>
        <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 1 }}>
          {txn.categoria}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text
          style={{
            color: isIncome ? C.green : C.textPrimary,
            fontSize: 14,
            fontWeight: "700",
          }}
        >
          {isIncome ? "+" : "-"}
          {formatMXN(txn.monto)}
        </Text>
        <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>
          {timeAgo(txn.fecha)}
        </Text>
      </View>
    </View>
  );
}
