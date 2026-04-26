import React from "react";
import { View, ViewStyle, Pressable, StyleSheet } from "react-native";

interface AppCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: "default" | "elevated" | "outlined";
  padding?: number;
}

export function AppCard({ children, style, onPress, variant = "default", padding = 20 }: AppCardProps) {
  const cardStyle = [styles.base, variant === "elevated" && styles.elevated, variant === "outlined" && styles.outlined, { padding }, style];
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [...cardStyle, pressed && { opacity: 0.80, transform: [{ scale: 0.985 }] }]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  base: { backgroundColor: "#1C1C1E", borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.08)" },
  elevated: { backgroundColor: "#2C2C2E" },
  outlined: { backgroundColor: "transparent", borderColor: "rgba(255,255,255,0.12)" },
});
