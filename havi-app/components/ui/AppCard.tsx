// ============================================================
// AppCard — Card reutilizable — Light mode fintech
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
          pressed && { opacity: 0.88, transform: [{ scale: 0.985 }] },
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
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  elevated: {
    backgroundColor: "#FAFAFA",
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 4,
  },
  outlined: {
    backgroundColor: "transparent",
    borderColor: "#E5E7EB",
    shadowOpacity: 0,
    elevation: 0,
  },
});
