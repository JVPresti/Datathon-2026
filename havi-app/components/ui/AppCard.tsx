// ============================================================
// AppCard — Dark mode reutilizable — Obsidian Intelligence
// ============================================================

import React from "react";
import { View, ViewStyle, Pressable, StyleSheet } from "react-native";

interface AppCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: "default" | "elevated" | "outlined";
  padding?: number;
}

export function AppCard({
  children,
  style,
  onPress,
  variant = "default",
  padding = 20,
}: AppCardProps) {
  const cardStyle = [
    styles.base,
    variant === "elevated" && styles.elevated,
    variant === "outlined" && styles.outlined,
    { padding },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          ...cardStyle,
          pressed && { opacity: 0.82, transform: [{ scale: 0.985 }] },
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: "#161B27",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  elevated: {
    backgroundColor: "#1C2235",
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 6,
  },
  outlined: {
    backgroundColor: "transparent",
    borderColor: "rgba(255,255,255,0.10)",
    shadowOpacity: 0,
    elevation: 0,
  },
});
