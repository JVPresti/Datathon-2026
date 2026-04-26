import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

const D = {
  bg: "#000000",
  surface: "#111111",
  card: "#1C1C1E",
  sep: "rgba(255,255,255,0.08)",
  text: "#FFFFFF",
  textSub: "rgba(255,255,255,0.55)",
  textMuted: "rgba(255,255,255,0.30)",
};

export default function TransferirScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: D.bg }}>
      {/* Header */}
      <View style={{
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: D.sep,
      }}>
        <Text style={{ color: D.text, fontSize: 24, fontWeight: "700" }}>Transferir</Text>
      </View>

      {/* Placeholder */}
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
        <View style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          backgroundColor: D.card,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 18,
        }}>
          <Ionicons name="swap-horizontal-outline" size={28} color={D.textSub} />
        </View>
        <Text style={{ color: D.text, fontSize: 18, fontWeight: "600", marginBottom: 8, textAlign: "center" }}>
          Próximamente
        </Text>
        <Text style={{ color: D.textMuted, fontSize: 14, lineHeight: 20, textAlign: "center", marginBottom: 28 }}>
          Las transferencias estarán disponibles pronto. Mientras tanto, puedes pedirle ayuda a Havi.
        </Text>
        <Pressable
          onPress={() => router.push("/(tabs)/chat")}
          style={({ pressed }) => ({
            backgroundColor: pressed ? "#E5E5E5" : "#FFFFFF",
            borderRadius: 14,
            paddingVertical: 13,
            paddingHorizontal: 24,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          })}
        >
          <Text style={{ color: "#000000", fontSize: 15 }}>✦</Text>
          <Text style={{ color: "#000000", fontSize: 14, fontWeight: "700" }}>Hablar con Havi</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
