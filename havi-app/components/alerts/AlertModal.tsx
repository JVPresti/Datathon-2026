// ============================================================
// ALERT MODAL — Hey Banco neutral dark design system
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
import { useToast } from "../../src/hooks/useToast";
import { HaviAlert } from "../../src/types";
import { formatMXN } from "../../src/data/mockData";
import { useRouter } from "expo-router";
import { MarkdownText } from "../../src/utils/markdown";

const { height } = Dimensions.get("window");

const D = {
  sheet: "#111111",
  card: "#1C1C1E",
  cardAlt: "#2C2C2E",
  sep: "rgba(255,255,255,0.08)",
  sepStrong: "rgba(255,255,255,0.12)",
  text: "#FFFFFF",
  textSub: "rgba(255,255,255,0.55)",
  textMuted: "rgba(255,255,255,0.30)",
  error: "#FF453A",
  warning: "#FF9F0A",
  success: "#30D158",
};

export default function AlertModal() {
  const { activeAlert, dismissAlert, markAsActioned } = useAlerts();
  const { showToast } = useToast();
  const slideAnim = useRef(new Animated.Value(height)).current;
  const router = useRouter();

  useEffect(() => {
    if (activeAlert) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: height, duration: 220, useNativeDriver: true }).start();
    }
  }, [activeAlert]);

  if (!activeAlert) return null;

  const handlePrimary = () => {
    // rechazo_limite primary is "Ver opciones" → open chat with context
    if (activeAlert.type === "rechazo_limite" && activeAlert.accion_primaria?.type === "chat") {
      dismissAlert();
      router.push({
        pathname: "/(tabs)/chat",
        params: { initialPrompt: buildChatPrompt(activeAlert) },
      });
      return;
    }
    const msg = getPrimaryToast(activeAlert);
    markAsActioned(activeAlert.id);
    dismissAlert();
    if (msg) showToast(msg, "success");
  };

  const handleSecondary = () => {
    if (activeAlert.type === "txn_atipica") {
      markAsActioned(activeAlert.id);
      dismissAlert();
      showToast("Tarjeta bloqueada. Contáctanos si necesitas ayuda.", "warning");
    } else if (activeAlert.accion_secundaria?.type === "chat") {
      dismissAlert();
      router.push({
        pathname: "/(tabs)/chat",
        params: { initialPrompt: buildChatPrompt(activeAlert) },
      });
    } else {
      dismissAlert();
    }
  };

  return (
    <Modal transparent visible={!!activeAlert} animationType="none" statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)" }} onPress={dismissAlert} />
      <Animated.View style={{ position: "absolute", bottom: 0, left: 0, right: 0, transform: [{ translateY: slideAnim }] }}>
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

function getPrimaryToast(alert: HaviAlert): string | null {
  switch (alert.type) {
    case "txn_atipica":
      return "Compra liberada. Todo en orden.";
    case "rechazo_saldo":
    case "rechazo_limite":
      return "Pago reintentado con tarjeta de crédito Hey.";
    case "upselling_pro":
    case "cashback_proximo_perdido":
      return "Solicitud de Hey Pro enviada. Havi te avisará.";
    default:
      return "Listo, acción realizada.";
  }
}

/** Builds a contextual prompt so Havi knows the situation the moment the chat opens. */
function buildChatPrompt(alert: HaviAlert): string {
  const uc1 = alert.uc1_context;
  const uc4 = alert.uc4_context;

  switch (alert.type) {
    case "rechazo_saldo": {
      const monto = uc1?.monto_rechazado ?? 0;
      const comercio = uc1?.comercio ?? "un comercio";
      const altDisponible = uc1?.monto_disponible_alternativo
        ? ` Tengo $${uc1.monto_disponible_alternativo.toLocaleString("es-MX")} disponibles en mi cuenta alternativa.`
        : "";
      return `Me rechazaron un pago de $${monto.toLocaleString("es-MX")} en ${comercio} por saldo insuficiente.${altDisponible} ¿Qué puedo hacer?`;
    }
    case "rechazo_limite": {
      const monto = uc1?.monto_rechazado ?? 0;
      const comercio = uc1?.comercio ?? "un comercio";
      return `Me rechazaron un cargo de $${monto.toLocaleString("es-MX")} en ${comercio} por límite de crédito. ¿Cómo puedo resolverlo?`;
    }
    case "txn_atipica": {
      const monto = uc4?.monto ?? 0;
      const comercio = uc4?.comercio ?? "un comercio";
      return `Hay un cargo que no reconozco: $${monto.toLocaleString("es-MX")} en ${comercio}. ¿Puede ser fraude?`;
    }
    case "cashback_proximo_perdido":
    case "upselling_pro":
      return "¿Cuánto cashback estoy perdiendo este mes por no tener Hey Pro? Quiero entender si me conviene activarlo.";
    default:
      return `Vi una alerta: "${alert.titulo}". ¿Puedes ayudarme?`;
  }
}

function AlertContent({
  alert, onPrimary, onSecondary, onDismiss,
}: { alert: HaviAlert; onPrimary: () => void; onSecondary: () => void; onDismiss: () => void }) {
  const cfg = getAlertConfig(alert);
  // UC4 security: secondary action (block) is destructive/danger
  const isUC4 = alert.type === "txn_atipica";

  return (
    <View style={styles.sheet}>
      {/* Handle */}
      <View style={styles.handle} />

      {/* Header row */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 18, gap: 12 }}>
        <View style={[styles.iconCircle, { backgroundColor: cfg.iconBg }]}>
          <Ionicons name={cfg.icon as any} size={22} color={cfg.iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{cfg.label}</Text>
          <Text style={styles.title}>{alert.titulo}</Text>
        </View>
        <Pressable onPress={onDismiss} hitSlop={14}>
          <Ionicons name="close" size={18} color={D.textMuted} />
        </Pressable>
      </View>

      {/* Havi message */}
      <View style={styles.haviMsgCard}>
        <View style={styles.haviAvatarSm}>
          <Text style={{ fontSize: 11, color: D.text }}>✦</Text>
        </View>
        <MarkdownText
          text={alert.mensaje}
          style={{ color: "rgba(255,255,255,0.88)", fontSize: 14, lineHeight: 22, flex: 1 }}
        />
      </View>

      {/* UC4 context — transaction detail */}
      {alert.uc4_context && (
        <View style={styles.contextCard}>
          <ContextRow label="Comercio" value={alert.uc4_context.comercio} />
          <View style={styles.contextSep} />
          <ContextRow label="Monto" value={formatMXN(alert.uc4_context.monto)} valueColor={D.error} />
          <View style={styles.contextSep} />
          <ContextRow
            label="Ciudad"
            value={`${alert.uc4_context.ciudad_transaccion.split(",")[0]}${alert.uc4_context.es_internacional ? " 🌍" : ""}`}
          />
          <View style={styles.contextSep} />
          <ContextRow
            label="Hora"
            value={`${alert.uc4_context.hora_del_dia}:14 AM${alert.uc4_context.es_nocturna ? " · Horario inusual" : ""}`}
            valueColor={alert.uc4_context.es_nocturna ? D.warning : undefined}
          />
        </View>
      )}

      {/* UC1 context — alternative product */}
      {alert.uc1_context && (
        <View style={styles.contextCard}>
          <ContextRow
            label="Comercio"
            value={alert.uc1_context.comercio}
          />
          <View style={styles.contextSep} />
          <ContextRow
            label="Alternativa disponible"
            value={alert.uc1_context.producto_alternativo?.replace(/_/g, " ").replace(/hey/i, "Hey") ?? "—"}
          />
          <View style={styles.contextSep} />
          <ContextRow
            label="Límite disponible"
            value={formatMXN(alert.uc1_context.monto_disponible_alternativo ?? 0)}
            valueColor={D.success}
          />
        </View>
      )}

      {/* Actions */}
      <View style={{ gap: 8, marginTop: 4 }}>
        {alert.accion_primaria && (
          <Pressable
            onPress={onPrimary}
            style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.btnPrimaryText}>{alert.accion_primaria.label}</Text>
          </Pressable>
        )}
        {alert.accion_secundaria && (
          <Pressable
            onPress={onSecondary}
            style={({ pressed }) => [
              styles.btnSecondary,
              isUC4 && styles.btnDanger,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.btnSecondaryText, isUC4 && { color: D.error }]}>
              {alert.accion_secundaria.label}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function ContextRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10 }}>
      <Text style={{ color: D.textMuted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: valueColor ?? D.text, fontSize: 14, fontWeight: "600" }}>{value}</Text>
    </View>
  );
}

function getAlertConfig(alert: HaviAlert) {
  switch (alert.type) {
    case "txn_atipica":
      return { icon: "shield", iconColor: D.error, iconBg: "rgba(255,69,58,0.12)", label: "Seguridad" };
    case "rechazo_saldo":
    case "rechazo_limite":
      return { icon: "card-outline", iconColor: D.warning, iconBg: "rgba(255,159,10,0.12)", label: "Pago rechazado" };
    case "cashback_proximo_perdido":
    case "upselling_pro":
      return { icon: "star-outline", iconColor: D.text, iconBg: D.card, label: "Oportunidad" };
    default:
      return { icon: "notifications-outline", iconColor: D.text, iconBg: D.card, label: "Havi" };
  }
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: D.sheet,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 44,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: D.sepStrong,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 22,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: D.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  title: { color: D.text, fontSize: 17, fontWeight: "700" },
  haviMsgCard: {
    backgroundColor: D.card,
    borderRadius: 16,
    borderTopLeftRadius: 4,
    padding: 14,
    marginBottom: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  haviAvatarSm: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: D.cardAlt,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  contextCard: {
    backgroundColor: D.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  contextSep: { height: StyleSheet.hairlineWidth, backgroundColor: D.sep },
  btnPrimary: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  btnPrimaryText: { color: "#000000", fontSize: 15, fontWeight: "700" },
  btnSecondary: {
    backgroundColor: D.card,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: D.sep,
  },
  btnDanger: {
    borderColor: "rgba(255,69,58,0.25)",
    backgroundColor: "rgba(255,69,58,0.06)",
  },
  btnSecondaryText: { color: D.textSub, fontSize: 15, fontWeight: "500" },
});
