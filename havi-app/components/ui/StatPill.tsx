// ============================================================
// StatPill — Chip/badge de estadística pequeño — Light mode
// ============================================================

import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";

interface StatPillProps {
  label: string;
  value: string;
  color?: string;
  style?: ViewStyle;
}

export function StatPill({
  label,
  value,
  color = "#6D5EF8",
  style,
}: StatPillProps) {
  return (
    <View
      style={[
        styles.container,
        { borderColor: `${color}25`, backgroundColor: `${color}0D` },
        style,
      ]}
    >
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  value: {
    fontSize: 15,
    fontWeight: "800",
  },
  label: {
    color: "#6B7280",
    fontSize: 11,
    marginTop: 2,
    fontWeight: "500",
  },
});
