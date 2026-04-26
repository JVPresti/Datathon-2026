// ============================================================
// GradientButton — Botón con gradiente suave — Light mode
// Gradientes discretos, pastel suave, sin neón
// ============================================================

import React from "react";
import { Pressable, Text, ViewStyle, TextStyle, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type GradientVariant =
  | "purple"
  | "blue"
  | "green"
  | "rose"
  | "orange"
  | "mono";

// Gradientes suaves — max 2 stops, tonos pastel/sobrios
const GRADIENTS: Record<GradientVariant, [string, string, ...string[]]> = {
  purple: ["#6D5EF8", "#9D8FF8"],
  blue: ["#3B82F6", "#60A5FA"],
  green: ["#10B981", "#34D399"],
  rose: ["#F43F5E", "#FB7185"],
  orange: ["#F97316", "#FB923C"],
  mono: ["#374151", "#6B7280"],
};

// Color de texto por variante para mantener contraste
const TEXT_COLORS: Record<GradientVariant, string> = {
  purple: "#FFFFFF",
  blue: "#FFFFFF",
  green: "#FFFFFF",
  rose: "#FFFFFF",
  orange: "#FFFFFF",
  mono: "#FFFFFF",
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
  variant = "purple",
  disabled = false,
  size = "md",
  style,
  textStyle,
}: GradientButtonProps) {
  const padding = size === "sm" ? 10 : size === "lg" ? 18 : 14;
  const fontSize = size === "sm" ? 13 : size === "lg" ? 17 : 15;
  const textColor = TEXT_COLORS[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.wrapper,
        style,
        pressed && { opacity: 0.82, transform: [{ scale: 0.97 }] },
        disabled && { opacity: 0.45 },
      ]}
    >
      <LinearGradient
        colors={GRADIENTS[variant]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { paddingVertical: padding }]}
      >
        <Text style={[styles.label, { fontSize, color: textColor }, textStyle]}>{label}</Text>
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
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
