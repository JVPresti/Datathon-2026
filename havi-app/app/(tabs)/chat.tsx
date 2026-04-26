// ============================================================
// HAVI CHAT — Copiloto financiero — Obsidian Intelligence dark
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
import {
  haviService,
  INITIAL_PILLS,
  sendHaviMessage,
  executeBudgetLimit,
  executePayrollPortability,
  ChatAction,
} from "../../src/services/haviService";
import { ChatMessage } from "../../src/types";
import { TRANSACCIONES_MOCK } from "../../src/data/mockData";

const D = {
  bg: "#07090E",
  surface: "#0D1018",
  card: "#161B27",
  cardAlt: "#1C2235",
  border: "rgba(255,255,255,0.07)",
  borderAccent: "rgba(6,182,212,0.18)",
  text: "#EFF6FF",
  textSub: "rgba(239,246,255,0.55)",
  textMuted: "rgba(239,246,255,0.30)",
  accent: "#06B6D4",
  accentDeep: "#0891B2",
  accentGlow: "rgba(6,182,212,0.10)",
  success: "#4ADE80",
  error: "#F87171",
  inputBg: "#111520",
};

let msgId = 0;
function newId() { return `m-${++msgId}-${Date.now()}`; }

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "havi",
  content: "Hola 👋 Soy Havi, tu copiloto financiero. Analizo tus movimientos, detecto anomalías y encuentro oportunidades de ahorro. ¿En qué te puedo ayudar hoy?",
  timestamp: new Date().toISOString(),
  suggestions: INITIAL_PILLS.slice(0, 3).map((p) => p.label),
};

export default function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activePills, setActivePills] = useState<string[]>(INITIAL_PILLS.slice(0, 4).map((p) => p.label));
  const [pendingAction, setPendingAction] = useState<{ action: ChatAction; label: string } | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const { alerts } = useAlerts();
  const dotAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  useEffect(() => {
    if (isLoading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(dotAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      dotAnim.stopAnimation();
      dotAnim.setValue(0);
    }
  }, [isLoading]);

  const appendHavi = useCallback((text: string, suggestions?: string[]) => {
    setMessages((prev) => [...prev, {
      id: newId(), role: "havi", content: text,
      timestamp: new Date().toISOString(), suggestions,
    }]);
    if (suggestions?.length) setActivePills(suggestions);
  }, []);

  const executeAction = useCallback((action: ChatAction) => {
    setPendingAction(null);
    let r;
    if (action.type === "set_budget") r = executeBudgetLimit(action.categoria, action.limite);
    else r = executePayrollPortability();
    appendHavi(r.text, r.suggestions);
  }, [appendHavi]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    setInput("");
    setActivePills([]);
    setPendingAction(null);

    const userMsg: ChatMessage = { id: newId(), role: "user", content: text.trim(), timestamp: new Date().toISOString() };
    const loadingMsg: ChatMessage = { id: newId(), role: "havi", content: "", timestamp: new Date().toISOString(), status: "sending" };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setIsLoading(true);

    try {
      const result = await sendHaviMessage(text, TRANSACCIONES_MOCK);
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== loadingMsg.id);
        return [...filtered, { id: newId(), role: "havi", content: result.text, timestamp: new Date().toISOString(), suggestions: result.suggestions }];
      });
      if (result.suggestions?.length) setActivePills(result.suggestions);
      if (result.action && result.actionLabel) setPendingAction({ action: result.action, label: result.actionLabel });
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== loadingMsg.id));
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, appendHavi]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: D.bg }}>
      {/* ── Header ── */}
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: D.border,
        backgroundColor: D.bg,
      }}>
        <LinearGradient
          colors={["#06B6D4", "#818CF8", "#A855F7"]}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <Text style={{ fontSize: 17 }}>✦</Text>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={{ color: D.text, fontSize: 16, fontWeight: "700" }}>Havi</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: D.success }} />
            <Text style={{ color: D.textMuted, fontSize: 11 }}>Copiloto financiero activo</Text>
          </View>
        </View>
        <Pressable style={({ pressed }) => ({
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: pressed ? D.cardAlt : D.card,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: D.border,
        })}>
          <Ionicons name="ellipsis-horizontal" size={15} color={D.textMuted} />
        </Pressable>
      </View>

      {/* ── Messages + Input ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} onSend={sendMessage} dotAnim={dotAnim} />
          ))}
        </ScrollView>

        {/* ── Input area ── */}
        <View style={{
          paddingBottom: Platform.OS === "ios" ? 4 : 8,
          backgroundColor: D.bg,
          borderTopWidth: 1,
          borderTopColor: D.border,
        }}>
          {/* Pending action CTA */}
          {pendingAction && !isLoading && (
            <View style={{ marginHorizontal: 16, marginTop: 10, marginBottom: 4, flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() => executeAction(pendingAction.action)}
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor: pressed ? D.accentDeep : D.accent,
                  borderRadius: 14,
                  paddingVertical: 12,
                  alignItems: "center",
                })}
              >
                <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>
                  ✓ {pendingAction.label}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setPendingAction(null)}
                style={({ pressed }) => ({
                  paddingHorizontal: 16,
                  backgroundColor: pressed ? D.cardAlt : D.card,
                  borderRadius: 14,
                  paddingVertical: 12,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: D.border,
                })}
              >
                <Text style={{ color: D.textSub, fontSize: 14 }}>No</Text>
              </Pressable>
            </View>
          )}

          {/* Suggestion pills */}
          {activePills.length > 0 && !isLoading && !pendingAction && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 10, paddingTop: 10 }}
              style={{ maxHeight: 56 }}
            >
              {activePills.map((pill, i) => (
                <Pressable
                  key={i}
                  onPress={() => sendMessage(pill)}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? D.cardAlt : D.card,
                    borderRadius: 20,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderWidth: 1,
                    borderColor: D.border,
                  })}
                >
                  <Text style={{ color: D.textSub, fontSize: 13 }}>{pill}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {/* Text input row */}
          <View style={{
            flexDirection: "row",
            alignItems: "flex-end",
            gap: 8,
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 4,
          }}>
            <View style={{
              flex: 1,
              backgroundColor: D.inputBg,
              borderRadius: 22,
              borderWidth: 1,
              borderColor: D.border,
              paddingHorizontal: 16,
              paddingVertical: Platform.OS === "ios" ? 12 : 8,
              minHeight: 44,
              maxHeight: 100,
              justifyContent: "center",
            }}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Pregúntale a Havi..."
                placeholderTextColor={D.textMuted}
                style={{ color: D.text, fontSize: 15, padding: 0 }}
                multiline
                onSubmitEditing={() => sendMessage(input)}
                blurOnSubmit={false}
              />
            </View>
            <Pressable
              onPress={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: !input.trim() || isLoading ? D.card : pressed ? D.accentDeep : D.accent,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: !input.trim() || isLoading ? D.border : D.accent,
              })}
            >
              <Ionicons
                name="arrow-up"
                size={18}
                color={!input.trim() || isLoading ? D.textMuted : "#fff"}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── MessageBubble ────────────────────────────────────────────

function MessageBubble({
  message,
  onSend,
  dotAnim,
}: {
  message: ChatMessage;
  onSend: (t: string) => void;
  dotAnim: Animated.Value;
}) {
  const isHavi = message.role === "havi";
  const isLoading = message.status === "sending";

  if (isLoading) {
    return (
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, alignSelf: "flex-start", maxWidth: "80%" }}>
        <LinearGradient
          colors={["#06B6D4", "#818CF8"]}
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Text style={{ fontSize: 11 }}>✦</Text>
        </LinearGradient>
        <View style={{
          backgroundColor: "#161B27",
          borderRadius: 18,
          borderTopLeftRadius: 4,
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.07)",
          flexDirection: "row",
          gap: 6,
          alignItems: "center",
        }}>
          {[0, 1, 2].map((i) => (
            <Animated.View
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: "#06B6D4",
                opacity: dotAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, i === 1 ? 1 : 0.6],
                }),
              }}
            />
          ))}
        </View>
      </View>
    );
  }

  if (!isHavi) {
    return (
      <View style={{ alignSelf: "flex-end", maxWidth: "78%" }}>
        <View style={{
          backgroundColor: D.card,
          borderRadius: 18,
          borderTopRightRadius: 4,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.09)",
        }}>
          <Text style={{ color: D.text, fontSize: 15, lineHeight: 22 }}>
            {message.content}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ alignSelf: "flex-start", maxWidth: "88%" }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
        <LinearGradient
          colors={["#06B6D4", "#818CF8"]}
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Text style={{ fontSize: 11 }}>✦</Text>
        </LinearGradient>
        <View style={{
          backgroundColor: "#0F1825",
          borderRadius: 18,
          borderTopLeftRadius: 4,
          paddingHorizontal: 16,
          paddingVertical: 13,
          borderWidth: 1,
          borderColor: "rgba(6,182,212,0.14)",
          flex: 1,
        }}>
          <Text style={{ color: D.text, fontSize: 15, lineHeight: 22 }}>
            {message.content}
          </Text>
        </View>
      </View>

      {message.suggestions && message.suggestions.length > 0 && (
        <View style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 10,
          marginLeft: 36,
        }}>
          {message.suggestions.map((s, i) => (
            <Pressable
              key={i}
              onPress={() => onSend(s)}
              style={({ pressed }) => ({
                backgroundColor: pressed ? D.cardAlt : D.card,
                borderRadius: 16,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderWidth: 1,
                borderColor: D.borderAccent,
              })}
            >
              <Text style={{ color: D.accent, fontSize: 13, fontWeight: "500" }}>{s}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
