import React from "react";
import { Pressable, Text, ViewStyle, TextStyle, StyleSheet } from "react-native";

// In the Hey Banco design language, primary CTAs are white on black — no gradients.
type Variant = "primary" | "secondary" | "danger";

interface GradientButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function GradientButton({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  size = "md",
  style,
  textStyle,
}: GradientButtonProps) {
  const padding = size === "sm" ? 10 : size === "lg" ? 18 : 14;
  const fontSize = size === "sm" ? 13 : size === "lg" ? 17 : 15;

  const bg = variant === "primary" ? "#FFFFFF" : variant === "danger" ? "#FF453A" : "#1C1C1E";
  const color = variant === "primary" ? "#000000" : "#FFFFFF";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.wrapper,
        { backgroundColor: bg, paddingVertical: padding },
        style,
        pressed && { opacity: 0.80 },
        disabled && { opacity: 0.35 },
      ]}
    >
      <Text style={[styles.label, { fontSize, color }, textStyle]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  label: { fontWeight: "600", letterSpacing: 0.2 },
});
