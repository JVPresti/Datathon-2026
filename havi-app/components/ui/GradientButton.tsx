// ============================================================
// GradientButton — Dark mode — Obsidian Intelligence
// ============================================================

import React from "react";
import { Pressable, Text, ViewStyle, TextStyle, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type GradientVariant = "cyan" | "purple" | "blue" | "green" | "rose" | "orange" | "mono";

const GRADIENTS: Record<GradientVariant, [string, string, ...string[]]> = {
  cyan: ["#06B6D4", "#0891B2"],
  purple: ["#818CF8", "#6366F1"],
  blue: ["#3B82F6", "#2563EB"],
  green: ["#4ADE80", "#16A34A"],
  rose: ["#F87171", "#DC2626"],
  orange: ["#FBBF24", "#D97706"],
  mono: ["#374151", "#1F2937"],
};

interface GradientButtonProps {
  label: string;
  onPress: () => void;
  variant?: GradientVariant;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function GradientButton({
  label,
  onPress,
  variant = "cyan",
  disabled = false,
  size = "md",
  style,
  textStyle,
}: GradientButtonProps) {
  const padding = size === "sm" ? 10 : size === "lg" ? 18 : 14;
  const fontSize = size === "sm" ? 13 : size === "lg" ? 17 : 15;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.wrapper,
        style,
        pressed && { opacity: 0.80, transform: [{ scale: 0.97 }] },
        disabled && { opacity: 0.35 },
      ]}
    >
      <LinearGradient
        colors={GRADIENTS[variant]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { paddingVertical: padding }]}
      >
        <Text style={[styles.label, { fontSize }, textStyle]}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 16,
    overflow: "hidden",
  },
  gradient: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  label: {
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
