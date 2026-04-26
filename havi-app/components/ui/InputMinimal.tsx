// ============================================================
// InputMinimal — Input de texto minimalista — Light mode
// ============================================================

import React from "react";
import {
  TextInput,
  View,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from "react-native";

interface InputMinimalProps extends TextInputProps {
  containerStyle?: ViewStyle;
}

export function InputMinimal({ containerStyle, style, ...props }: InputMinimalProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput
        placeholderTextColor="#9CA3AF"
        style={[styles.input, style]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#111520",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    color: "#EFF6FF",
    fontSize: 14,
    maxHeight: 100,
  },
});
