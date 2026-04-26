// ============================================================
// SectionHeader — Título de sección reutilizable — Light mode
// ============================================================

import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

interface SectionHeaderProps {
  title: string;
  action?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, action, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {action && onAction && (
        <Pressable onPress={onAction}>
          <Text style={styles.action}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    color: "#111111",
    fontSize: 17,
    fontWeight: "700",
  },
  action: {
    color: "#6D5EF8",
    fontSize: 13,
    fontWeight: "600",
  },
});
