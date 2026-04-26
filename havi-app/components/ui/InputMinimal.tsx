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
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    color: "#111111",
    fontSize: 14,
    maxHeight: 100,
  },
});
