// ============================================================
// HAVI CHAT — Copiloto financiero
// Hey Banco design language + markdown + conversation history
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
  Modal,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
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

// ── Hey Banco palette ────────────────────────────────────────
const D = {
  bg: "#000000",
  surface: "#111111",
  card: "#1C1C1E",
  cardAlt: "#2C2C2E",
  sep: "rgba(255,255,255,0.08)",
  sepStrong: "rgba(255,255,255,0.14)",
  text: "#FFFFFF",
  textSub: "rgba(255,255,255,0.55)",
  textMuted: "rgba(255,255,255,0.30)",
  success: "#30D158",
  warning: "#FF9F0A",
  error: "#FF453A",
};

// ── Types ────────────────────────────────────────────────────
interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  timestamp: string;
}

let msgId = 0;
function newId() { return `m-${++msgId}-${Date.now()}`; }

const makeWelcome = (): ChatMessage => ({
  id: "welcome",
  role: "havi",
  content: "Hola 👋 Soy **Havi**, tu copiloto financiero. Analizo tus movimientos, detecto anomalías y encuentro oportunidades de ahorro. ¿En qué te puedo ayudar?",
  timestamp: new Date().toISOString(),
  suggestions: INITIAL_PILLS.slice(0, 3).map((p) => p.label),
});

// ── Markdown renderer ────────────────────────────────────────
function MarkdownText({ text, style }: { text: string; style?: object }) {
  const lines = text.split("\n");
  return (
    <Text style={style}>
      {lines.map((line, li) => {
        const isBullet = line.startsWith("- ") || line.startsWith("• ");
        const content = isBullet ? line.slice(2) : line;
        return (
          <Text key={li}>
            {li > 0 && "\n"}
            {isBullet && "• "}
            {parseInline(content)}
          </Text>
        );
      })}
    </Text>
  );
}

function parseInline(str: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let m;
  while ((m = regex.exec(str)) !== null) {
    if (m.index > last) parts.push(str.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) {
      parts.push(
        <Text key={m.index} style={{ fontWeight: "700", color: "#FFFFFF" }}>
          {tok.slice(2, -2)}
        </Text>
      );
    } else if (tok.startsWith("*")) {
      parts.push(
        <Text key={m.index} style={{ fontStyle: "italic" }}>
          {tok.slice(1, -1)}
        </Text>
      );
    } else if (tok.startsWith("`")) {
      parts.push(
        <Text
          key={m.index}
          style={{
            fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
            fontSize: 12,
            backgroundColor: "rgba(255,255,255,0.10)",
            color: "#FFFFFF",
          }}
        >
          {tok.slice(1, -1)}
        </Text>
      );
    }
    last = m.index + tok.length;
  }
  if (last < str.length) parts.push(str.slice(last));
  return parts;
}

// ── Component ────────────────────────────────────────────────
export default function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([makeWelcome()]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activePills, setActivePills] = useState<string[]>(
    INITIAL_PILLS.slice(0, 4).map((p) => p.label)
  );
  const [pendingAction, setPendingAction] = useState<{ action: ChatAction; label: string } | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const dotAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages]);

  useEffect(() => {
    if (isLoading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(dotAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      dotAnim.stopAnimation();
      dotAnim.setValue(0);
    }
  }, [isLoading]);

  // ── New Chat ──────────────────────────────────────────────
  const startNewChat = useCallback(() => {
    const userMsgs = messages.filter((m) => m.role === "user");
    if (userMsgs.length > 0) {
      const title = userMsgs[0].content.slice(0, 45) + (userMsgs[0].content.length > 45 ? "…" : "");
      setConversations((prev) => [
        {
          id: Date.now().toString(),
          title,
          messages,
          timestamp: new Date().toISOString(),
        },
        ...prev.slice(0, 14),
      ]);
    }
    setMessages([makeWelcome()]);
    setActivePills(INITIAL_PILLS.slice(0, 4).map((p) => p.label));
    setPendingAction(null);
    setInput("");
    haviService.clearHistory();
  }, [messages]);

  const loadConversation = useCallback((conv: Conversation) => {
    setMessages(conv.messages);
    setActivePills([]);
    setShowHistory(false);
  }, []);

  // ── Actions ───────────────────────────────────────────────
  const appendHavi = useCallback((text: string, suggestions?: string[]) => {
    setMessages((prev) => [
      ...prev,
      { id: newId(), role: "havi", content: text, timestamp: new Date().toISOString(), suggestions },
    ]);
    if (suggestions?.length) setActivePills(suggestions);
  }, []);

  const executeAction = useCallback((action: ChatAction) => {
    setPendingAction(null);
    const r = action.type === "set_budget"
      ? executeBudgetLimit(action.categoria, action.limite)
      : executePayrollPortability();
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
        return [
          ...filtered,
          { id: newId(), role: "havi", content: result.text, timestamp: new Date().toISOString(), suggestions: result.suggestions },
        ];
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
      <View style={styles.header}>
        <Pressable
          onPress={() => setShowHistory(true)}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            flex: 1,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <View style={styles.haviAvatar}>
            <Text style={{ fontSize: 16, color: "#FFFFFF" }}>✦</Text>
          </View>
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Text style={{ color: D.text, fontSize: 16, fontWeight: "700" }}>Havi</Text>
              <Ionicons name="chevron-down" size={13} color={D.textMuted} />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: D.success }} />
              <Text style={{ color: D.textMuted, fontSize: 11 }}>Copiloto financiero</Text>
            </View>
          </View>
        </Pressable>
        <Pressable
          onPress={startNewChat}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            paddingHorizontal: 12,
            paddingVertical: 7,
            backgroundColor: pressed ? D.cardAlt : D.card,
            borderRadius: 10,
          })}
        >
          <Ionicons name="add" size={15} color={D.textSub} />
          <Text style={{ color: D.textSub, fontSize: 13 }}>Nuevo chat</Text>
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

        {/* ── Bottom bar ── */}
        <View style={styles.inputArea}>
          {/* Pending action */}
          {pendingAction && !isLoading && (
            <View style={{ marginHorizontal: 16, marginTop: 8, marginBottom: 4, flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() => executeAction(pendingAction.action)}
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor: pressed ? "#E5E5E5" : "#FFFFFF",
                  borderRadius: 12,
                  paddingVertical: 12,
                  alignItems: "center",
                })}
              >
                <Text style={{ color: "#000000", fontSize: 14, fontWeight: "700" }}>
                  ✓ {pendingAction.label}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setPendingAction(null)}
                style={({ pressed }) => ({
                  paddingHorizontal: 14,
                  backgroundColor: pressed ? D.cardAlt : D.card,
                  borderRadius: 12,
                  paddingVertical: 12,
                  alignItems: "center",
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: D.sep,
                })}
              >
                <Text style={{ color: D.textSub, fontSize: 14 }}>No</Text>
              </Pressable>
            </View>
          )}

          {/* Pills */}
          {activePills.length > 0 && !isLoading && !pendingAction && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 10 }}
              style={{ maxHeight: 52 }}
            >
              {activePills.map((pill, i) => (
                <Pressable
                  key={i}
                  onPress={() => sendMessage(pill)}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? D.cardAlt : D.card,
                    borderRadius: 18,
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: D.sepStrong,
                  })}
                >
                  <Text style={{ color: D.textSub, fontSize: 13 }}>{pill}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {/* Text input */}
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
            <View style={styles.textInputWrap}>
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
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: !input.trim() || isLoading ? D.card : pressed ? "#E5E5E5" : "#FFFFFF",
                alignItems: "center",
                justifyContent: "center",
              })}
            >
              <Ionicons
                name="arrow-up"
                size={18}
                color={!input.trim() || isLoading ? D.textMuted : "#000000"}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ── Conversation History Modal ── */}
      <Modal
        visible={showHistory}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowHistory(false)}
      >
        <View style={{ flex: 1, backgroundColor: D.surface }}>
          {/* Modal header */}
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 16,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: D.sep,
          }}>
            <Text style={{ color: D.text, fontSize: 18, fontWeight: "700" }}>Conversaciones</Text>
            <Pressable
              onPress={() => setShowHistory(false)}
              style={({ pressed }) => ({
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: pressed ? D.cardAlt : D.card,
                alignItems: "center",
                justifyContent: "center",
              })}
            >
              <Ionicons name="close" size={16} color={D.textSub} />
            </Pressable>
          </View>

          {/* Current conversation as first item */}
          <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
            <Pressable
              onPress={() => setShowHistory(false)}
              style={({ pressed }) => ({
                paddingHorizontal: 20,
                paddingVertical: 16,
                backgroundColor: pressed ? D.cardAlt : "transparent",
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: D.sep,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              })}
            >
              <View style={styles.haviAvatarSm}>
                <Text style={{ fontSize: 12, color: "#FFFFFF" }}>✦</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: D.text, fontSize: 14, fontWeight: "600" }}>
                  Conversación actual
                </Text>
                <Text style={{ color: D.textMuted, fontSize: 12, marginTop: 1 }}>
                  {messages.filter((m) => m.role === "user").length} mensajes
                </Text>
              </View>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: D.success }} />
            </Pressable>

            {conversations.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 48 }}>
                <Text style={{ color: D.textMuted, fontSize: 14 }}>
                  Sin conversaciones previas
                </Text>
                <Text style={{ color: D.textMuted, fontSize: 13, marginTop: 4 }}>
                  Toca "Nuevo chat" para empezar una nueva
                </Text>
              </View>
            ) : (
              conversations.map((conv) => (
                <Pressable
                  key={conv.id}
                  onPress={() => loadConversation(conv)}
                  style={({ pressed }) => ({
                    paddingHorizontal: 20,
                    paddingVertical: 16,
                    backgroundColor: pressed ? D.cardAlt : "transparent",
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: D.sep,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  })}
                >
                  <View style={styles.haviAvatarSm}>
                    <Text style={{ fontSize: 12, color: "#FFFFFF" }}>✦</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: D.text, fontSize: 14, fontWeight: "500" }} numberOfLines={1}>
                      {conv.title}
                    </Text>
                    <Text style={{ color: D.textMuted, fontSize: 12, marginTop: 1 }}>
                      {timeAgoStr(conv.timestamp)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={D.textMuted} />
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
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
        <View style={styles.haviAvatarSm}>
          <Text style={{ fontSize: 12, color: "#FFFFFF" }}>✦</Text>
        </View>
        <View style={[styles.haviMsgBubble, { paddingVertical: 14, paddingHorizontal: 16, flexDirection: "row", gap: 5, alignItems: "center" }]}>
          {[0, 1, 2].map((i) => (
            <Animated.View
              key={i}
              style={{
                width: 5,
                height: 5,
                borderRadius: 2.5,
                backgroundColor: "rgba(255,255,255,0.60)",
                opacity: dotAnim.interpolate({ inputRange: [0, 1], outputRange: [0.25, i === 1 ? 0.9 : 0.55] }),
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
        <View style={styles.userMsgBubble}>
          <Text style={{ color: "#FFFFFF", fontSize: 15, lineHeight: 22 }}>
            {message.content}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ alignSelf: "flex-start", maxWidth: "88%" }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
        <View style={styles.haviAvatarSm}>
          <Text style={{ fontSize: 12, color: "#FFFFFF" }}>✦</Text>
        </View>
        <View style={[styles.haviMsgBubble, { flex: 1 }]}>
          <MarkdownText
            text={message.content}
            style={{ color: "rgba(255,255,255,0.90)", fontSize: 15, lineHeight: 22 }}
          />
        </View>
      </View>

      {message.suggestions && message.suggestions.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 8, marginLeft: 36 }}>
          {message.suggestions.map((s, i) => (
            <Pressable
              key={i}
              onPress={() => onSend(s)}
              style={({ pressed }) => ({
                backgroundColor: pressed ? D.cardAlt : D.card,
                borderRadius: 14,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: D.sepStrong,
              })}
            >
              <Text style={{ color: D.textSub, fontSize: 13 }}>{s}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Helpers ──────────────────────────────────────────────────
function timeAgoStr(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Ahora";
  if (m < 60) return `Hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h}h`;
  return `Hace ${Math.floor(h / 24)} días`;
}

// ── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  haviAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1C1C1E",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.14)",
  },
  haviAvatarSm: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1C1C1E",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
  },
  haviMsgBubble: {
    backgroundColor: "#1C1C1E",
    borderRadius: 18,
    borderTopLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  userMsgBubble: {
    backgroundColor: "#2C2C2E",
    borderRadius: 18,
    borderTopRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputArea: {
    backgroundColor: "#000000",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
    paddingBottom: Platform.OS === "ios" ? 4 : 8,
  },
  textInputWrap: {
    flex: 1,
    backgroundColor: "#1C1C1E",
    borderRadius: 21,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 11 : 8,
    minHeight: 42,
    maxHeight: 100,
    justifyContent: "center",
  },
});
