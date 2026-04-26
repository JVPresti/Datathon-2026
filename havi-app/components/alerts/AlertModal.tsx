// ============================================================
// ALERT MODAL — Aparece encima de cualquier pantalla
// Maneja UC1 (rechazo), UC4 (anomalía), UC3 (upselling)
// ============================================================

import React, { useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  Animated,
  Dimensions,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAlerts } from "../../src/hooks/useAlerts";
import { HaviAlert } from "../../src/types";
import { formatMXN } from "../../src/data/mockData";
import { useRouter } from "expo-router";

const { height } = Dimensions.get("window");

export default function AlertModal() {
  const { activeAlert, dismissAlert, markAsActioned } = useAlerts();
  const slideAnim = useRef(new Animated.Value(height)).current;
  const router = useRouter();

  useEffect(() => {
    if (activeAlert) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [activeAlert]);

  if (!activeAlert) return null;

  const handlePrimary = () => {
    markAsActioned(activeAlert.id);
    dismissAlert();
    // En un sistema real aquí se llamaría la tool correspondiente
  };

  const handleSecondary = () => {
    if (activeAlert.accion_secundaria?.type === "chat") {
      dismissAlert();
      router.push("/(tabs)/chat");
    } else if ((activeAlert.accion_secundaria?.type as string) === "block") {
      markAsActioned(activeAlert.id);
      dismissAlert();
    } else {
      dismissAlert();
    }
  };

  return (
    <Modal transparent visible={!!activeAlert} animationType="none" statusBarTranslucent>
      {/* Backdrop */}
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)" }}
        onPress={dismissAlert}
      />
      <Animated.View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <AlertContent
          alert={activeAlert}
          onPrimary={handlePrimary}
          onSecondary={handleSecondary}
          onDismiss={dismissAlert}
        />
      </Animated.View>
    </Modal>
  );
}

function AlertContent({
  alert,
  onPrimary,
  onSecondary,
  onDismiss,
}: {
  alert: HaviAlert;
  onPrimary: () => void;
  onSecondary: () => void;
  onDismiss: () => void;
}) {
  const config = getAlertConfig(alert);

  return (
    <View
      style={{
        backgroundColor: "#111111",
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 40,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: "rgba(255,255,255,0.10)",
      }}
    >
      {/* Handle bar */}
      <View
        style={{
          width: 40,
          height: 4,
          backgroundColor: "rgba(255,255,255,0.10)",
          borderRadius: 2,
          alignSelf: "center",
          marginBottom: 20,
        }}
      />

      {/* Icon + Header */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: config.iconBg,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 14,
          }}
        >
          <Ionicons name={config.icon as any} size={24} color={config.iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                backgroundColor: config.badgeBg,
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 2,
                marginBottom: 4,
              }}
            >
              <Text style={{ color: config.badgeColor, fontSize: 10, fontWeight: "700" }}>
                {config.badge}
              </Text>
            </View>
          </View>
          <Text style={{ color: "#F0F2F6", fontSize: 16, fontWeight: "700" }}>
            {alert.titulo}
          </Text>
        </View>
        <Pressable onPress={onDismiss} hitSlop={12}>
          <Ionicons name="close" size={20} color="#8B93B8" />
        </Pressable>
      </View>

      {/* Havi message bubble */}
      <View
        style={{
          backgroundColor: "#0F1825",
          borderRadius: 16,
          borderTopLeftRadius: 4,
          padding: 16,
          marginBottom: 20,
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 10,
          borderWidth: 1,
          borderColor: "rgba(6,182,212,0.12)",
        }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: "#06B6D4",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 12 }}>✦</Text>
        </View>
        <Text style={{ color: "#EFF6FF", fontSize: 14, lineHeight: 22, flex: 1 }}>
          {alert.mensaje}
        </Text>
      </View>

      {/* Extra context card (UC4) */}
      {alert.uc4_context && (
        <View
          style={{
            backgroundColor: "rgba(255,75,75,0.1)",
            borderRadius: 12,
            padding: 14,
            borderWidth: 1,
            borderColor: "rgba(255,75,75,0.3)",
            marginBottom: 20,
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <View>
            <Text style={{ color: "#8B93B8", fontSize: 11 }}>Comercio</Text>
            <Text style={{ color: "#F0F2F6", fontSize: 14, fontWeight: "600" }}>
              {alert.uc4_context.comercio}
            </Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ color: "#8B93B8", fontSize: 11 }}>Monto</Text>
            <Text style={{ color: "#FF4B4B", fontSize: 14, fontWeight: "700" }}>
              {formatMXN(alert.uc4_context.monto)}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ color: "#8B93B8", fontSize: 11 }}>Ciudad</Text>
            <Text style={{ color: "#F0F2F6", fontSize: 14, fontWeight: "600" }}>
              {alert.uc4_context.ciudad_transaccion.split(",")[0]}
            </Text>
          </View>
        </View>
      )}

      {/* UC1 context card */}
      {alert.uc1_context && (
        <View
          style={{
            backgroundColor: "rgba(255,184,0,0.1)",
            borderRadius: 12,
            padding: 14,
            borderWidth: 1,
            borderColor: "rgba(255,184,0,0.3)",
            marginBottom: 20,
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <View>
            <Text style={{ color: "#8B93B8", fontSize: 11 }}>Disponible en</Text>
            <Text style={{ color: "#F0F2F6", fontSize: 13, fontWeight: "600" }}>
              {alert.uc1_context.producto_alternativo?.replace(/_/g, " ")}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ color: "#8B93B8", fontSize: 11 }}>Saldo</Text>
            <Text style={{ color: "#00C896", fontSize: 14, fontWeight: "700" }}>
              {formatMXN(alert.uc1_context.monto_disponible_alternativo || 0)}
            </Text>
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={{ gap: 10 }}>
        {alert.accion_primaria && (
          <Pressable
            onPress={onPrimary}
            style={({ pressed }) => ({
              backgroundColor: pressed ? "#e04e1a" : config.primaryBg,
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: "center",
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>
              {alert.accion_primaria.label}
            </Text>
          </Pressable>
        )}
        {alert.accion_secundaria && (
          <Pressable
            onPress={onSecondary}
            style={({ pressed }) => ({
              backgroundColor: pressed ? "#1C2235" : "#161B27",
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
            })}
          >
            <Text style={{ color: "rgba(239,246,255,0.50)", fontSize: 15, fontWeight: "600" }}>
              {alert.accion_secundaria.label}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function getAlertConfig(alert: HaviAlert) {
  switch (alert.type) {
    case "txn_atipica":
      return {
        icon: "shield",
        iconColor: "#FF4B4B",
        iconBg: "rgba(255,75,75,0.15)",
        badge: "⚠️ SEGURIDAD",
        badgeBg: "rgba(255,75,75,0.15)",
        badgeColor: "#FF4B4B",
        primaryBg: "#FF4B4B",
      };
    case "rechazo_saldo":
    case "rechazo_limite":
      return {
        icon: "card",
        iconColor: "#FFB800",
        iconBg: "rgba(255,184,0,0.15)",
        badge: "💳 PAGO RECHAZADO",
        badgeBg: "rgba(255,184,0,0.15)",
        badgeColor: "#FFB800",
        primaryBg: "#FF5A1F",
      };
    case "cashback_proximo_perdido":
    case "upselling_pro":
      return {
        icon: "star",
        iconColor: "#00C896",
        iconBg: "rgba(0,200,150,0.15)",
        badge: "✨ OPORTUNIDAD",
        badgeBg: "rgba(0,200,150,0.15)",
        badgeColor: "#00C896",
        primaryBg: "#FF5A1F",
      };
    default:
      return {
        icon: "notifications",
        iconColor: "#FFFFFF",
        iconBg: "rgba(255,255,255,0.08)",
        badge: "HAVI",
        badgeBg: "rgba(255,255,255,0.08)",
        badgeColor: "#FFFFFF",
        primaryBg: "#FFFFFF",
      };
  }
}
