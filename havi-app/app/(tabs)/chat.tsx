// ============================================================
// HAVI CHAT — Copiloto financiero — Light mode fintech
// ============================================================

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useAlerts } from "../../src/hooks/useAlerts";
import { haviService, INITIAL_PILLS } from "../../src/services/haviService";
import { ChatMessage } from "../../src/types";
import { TRANSACCIONES_MOCK } from "../../src/data/mockData";

// ── Paleta light mode ─────────────────────────────────────────
const C = {
  bg: "#FFFFFF",
  surface: "#FAFAFA",
  card: "#F3F4F6",
  border: "#E5E7EB",
  textPrimary: "#111111",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  accent: "#6D5EF8",
  accentDeep: "#5848E0",
};

let messageIdCounter = 0;
function newId() {
  return `msg-${++messageIdCounter}-${Date.now()}`;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "havi",
  content:
    "Hola Valentina 👋 Soy Havi, tu copiloto financiero. Estoy aquí para ayudarte a entender tus finanzas, detectar movimientos inusuales y encontrar oportunidades de ahorro. ¿En qué te ayudo hoy?",
  timestamp: new Date().toISOString(),
  suggestions: INITIAL_PILLS.slice(0, 3).map((p) => p.label),
};

export default function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activePills, setActivePills] = useState<string[]>(
    INITIAL_PILLS.slice(0, 4).map((p) => p.label)
  );
  const scrollRef = useRef<ScrollView>(null);
  const { alerts } = useAlerts();

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;
      setInput("");
      setActivePills([]);

      const userMsg: ChatMessage = {
        id: newId(),
        role: "user",
        content: text.trim(),
        timestamp: new Date().toISOString(),
      };
      const loadingMsg: ChatMessage = {
        id: newId(),
        role: "havi",
        content: "",
        timestamp: new Date().toISOString(),
        status: "sending",
      };

      setMessages((prev) => [...prev, userMsg, loadingMsg]);
      setIsLoading(true);

      try {
        const result = await haviService.sendMessage(text, {
          transacciones: TRANSACCIONES_MOCK,
        });

        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== loadingMsg.id);
          return [
            ...filtered,
            {
              id: newId(),
              role: "havi",
              content: result.text,
              timestamp: new Date().toISOString(),
              suggestions: result.suggestions,
            },
          ];
        });

        if (result.suggestions?.length) {
          setActivePills(result.suggestions);
        }
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== loadingMsg.id));
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading]
  );

  const canSend = input.trim().length > 0 && !isLoading;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
          backgroundColor: C.bg,
        }}
      >
        <LinearGradient
          colors={[C.accentDeep, C.accent]}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
            shadowColor: C.accent,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 6,
          }}
        >
          <Text style={{ fontSize: 17 }}>✦</Text>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.textPrimary, fontSize: 16, fontWeight: "700" }}>Havi</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: "#10B981",
              }}
            />
            <Text style={{ color: C.textMuted, fontSize: 12 }}>Copiloto financiero activo</Text>
          </View>
        </View>
        <Pressable
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: pressed ? C.card : C.surface,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: C.border,
          })}
        >
          <Ionicons name="ellipsis-horizontal" size={16} color={C.textMuted} />
        </Pressable>
      </View>

      {/* Messages + Input */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1, backgroundColor: C.surface }}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} onSend={sendMessage} />
          ))}
        </ScrollView>

        {/* Pills + Input area */}
        <View style={{ paddingBottom: 8, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border }}>
          {activePills.length > 0 && !isLoading && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 10, paddingTop: 10 }}
              style={{ maxHeight: 56 }}
            >
              {activePills.map((pill, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => sendMessage(pill)}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? C.card : C.surface,
                    borderRadius: 20,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderWidth: 1,
                    borderColor: pressed ? `${C.accent}40` : C.border,
                    flexShrink: 0,
                  })}
                >
                  <Text style={{ color: C.textSecondary, fontSize: 13, fontWeight: "500" }}>
                    {pill}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {/* Input bar */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              paddingHorizontal: 16,
              paddingTop: 8,
              gap: 10,
            }}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: C.surface,
                borderRadius: 24,
                borderWidth: 1,
                borderColor: C.border,
                paddingHorizontal: 18,
                paddingVertical: 12,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Pregúntale a Havi..."
                placeholderTextColor={C.textMuted}
                style={{
                  flex: 1,
                  color: C.textPrimary,
                  fontSize: 14,
                  maxHeight: 100,
                }}
                multiline
                onSubmitEditing={() => sendMessage(input)}
                returnKeyType="send"
                blurOnSubmit={false}
              />
            </View>
            <Pressable
              onPress={() => sendMessage(input)}
              disabled={!canSend}
              style={({ pressed }) => ({
                width: 46,
                height: 46,
                borderRadius: 23,
                overflow: "hidden",
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.8 : !canSend ? 0.35 : 1,
              })}
            >
              {canSend ? (
                <LinearGradient
                  colors={[C.accentDeep, C.accent]}
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 23,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="send" size={17} color="#fff" />
                </LinearGradient>
              ) : (
                <View
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 23,
                    backgroundColor: C.surface,
                    borderWidth: 1,
                    borderColor: C.border,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="send" size={17} color={C.textMuted} />
                </View>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── MessageBubble ──────────────────────────────────────────────
function MessageBubble({
  message,
  onSend,
}: {
  message: ChatMessage;
  onSend: (text: string) => void;
}) {
  const isHavi = message.role === "havi";
  const isLoading = message.status === "sending";

  if (isLoading) {
    return (
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
        <HaviAvatar />
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 20,
            borderBottomLeftRadius: 4,
            padding: 16,
            borderWidth: 1,
            borderColor: C.border,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
          }}
        >
          <TypingIndicator />
        </View>
      </View>
    );
  }

  if (isHavi) {
    return (
      <View style={{ alignItems: "flex-start", gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
          <HaviAvatar />
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              borderBottomLeftRadius: 4,
              padding: 16,
              maxWidth: "80%",
              borderWidth: 1,
              borderColor: C.border,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
            }}
          >
            <Text style={{ color: C.textPrimary, fontSize: 14, lineHeight: 22 }}>
              {message.content}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // User bubble — gradiente suave acento
  return (
    <View style={{ alignItems: "flex-end" }}>
      <LinearGradient
        colors={[C.accentDeep, C.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 20,
          borderBottomRightRadius: 4,
          padding: 14,
          maxWidth: "75%",
        }}
      >
        <Text style={{ color: "#fff", fontSize: 14, lineHeight: 22 }}>
          {message.content}
        </Text>
      </LinearGradient>
    </View>
  );
}

function HaviAvatar() {
  return (
    <LinearGradient
      colors={["#5848E0", "#6D5EF8"]}
      style={{
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#6D5EF8",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      }}
    >
      <Text style={{ fontSize: 13 }}>✦</Text>
    </LinearGradient>
  );
}

function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -4, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ])
      ).start();
    };
    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);
  }, []);

  return (
    <View style={{ flexDirection: "row", gap: 4, paddingHorizontal: 4 }}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: 3.5,
            backgroundColor: C.textMuted,
            transform: [{ translateY: dot }],
          }}
        />
      ))}
    </View>
  );
}
