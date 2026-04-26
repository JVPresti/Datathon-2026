import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useToast, ToastItem, ToastType } from "../../src/hooks/useToast";

const ICON: Record<ToastType, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  success: { name: "checkmark-circle", color: "#34C759" },
  info:    { name: "sparkles",         color: "#FFFFFF" },
  error:   { name: "close-circle",     color: "#FF453A" },
  warning: { name: "warning",          color: "#FF9F0A" },
};

function SingleToast({ toast }: { toast: ToastItem }) {
  const { dismissToast } = useToast();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
    ]).start();

    const out = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 14, duration: 250, useNativeDriver: true }),
      ]).start(() => dismissToast(toast.id));
    }, 2700);

    return () => clearTimeout(out);
  }, []);

  const icon = ICON[toast.type];

  return (
    <Animated.View style={[styles.toast, { opacity, transform: [{ translateY }] }]}>
      <Pressable style={styles.inner} onPress={() => dismissToast(toast.id)}>
        <Ionicons name={icon.name} size={18} color={icon.color} />
        <Text style={styles.message}>{toast.message}</Text>
      </Pressable>
    </Animated.View>
  );
}

export function ToastContainer() {
  const { toasts } = useToast();
  if (!toasts.length) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map((t) => (
        <SingleToast key={t.id} toast={t} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 90,
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: "center",
    pointerEvents: "box-none",
  },
  toast: {
    width: "100%",
    backgroundColor: "#1C1C1E",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.10)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    marginTop: 8,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 10,
  },
  message: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
});
