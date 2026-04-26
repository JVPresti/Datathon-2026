import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

const D = {
  bg: "#000000",
  surface: "#111111",
  card: "#1C1C1E",
  cardAlt: "#2C2C2E",
  sep: "rgba(255,255,255,0.08)",
  text: "#FFFFFF",
  textSub: "rgba(255,255,255,0.55)",
  textMuted: "rgba(255,255,255,0.30)",
  success: "#30D158",
  warning: "#FF9F0A",
};

const CATEGORIAS = [
  {
    id: "recientes",
    label: "Recientes",
    icon: "time-outline" as const,
    sub: "Tus últimos pagos",
  },
  {
    id: "favoritos",
    label: "Favoritos",
    icon: "star-outline" as const,
    sub: "Guardados",
  },
  {
    id: "servicios",
    label: "Servicios",
    icon: "flash-outline" as const,
    sub: "Luz, agua, gas, teléfono",
  },
  {
    id: "inmobiliario",
    label: "Inmobiliario",
    icon: "home-outline" as const,
    sub: "Renta y crédito hipotecario",
  },
  {
    id: "gobierno",
    label: "Gobierno",
    icon: "business-outline" as const,
    sub: "SAT, trámites, municipios",
  },
  {
    id: "financieros",
    label: "Financieros",
    icon: "trending-up-outline" as const,
    sub: "Seguros, créditos, inversiones",
  },
  {
    id: "tarjetas",
    label: "Pago de tarjetas",
    icon: "card-outline" as const,
    sub: "Visa, Mastercard y más",
  },
  {
    id: "varios",
    label: "Varios",
    icon: "grid-outline" as const,
    sub: "Educación, donaciones y más",
  },
];

const RECIENTES = [
  { id: "1", comercio: "CFE", monto: 485, icon: "flash-outline" as const },
  { id: "2", comercio: "Telmex", monto: 399, icon: "call-outline" as const },
  { id: "3", comercio: "Totalplay", monto: 549, icon: "wifi-outline" as const },
];

function formatMXN(n: number) {
  return `$${n.toLocaleString("es-MX", { minimumFractionDigits: 0 })}`;
}

export default function PagosScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const categoriasFiltradas = query.trim()
    ? CATEGORIAS.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.sub.toLowerCase().includes(query.toLowerCase())
      )
    : CATEGORIAS;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: D.bg }}>
      {/* Header */}
      <View style={{
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 14,
      }}>
        <Text style={{ color: D.text, fontSize: 24, fontWeight: "700" }}>
          Pagos
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 36 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Buscador ── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: D.card,
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 12,
            gap: 10,
          }}>
            <Ionicons name="search-outline" size={18} color={D.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar servicio o empresa"
              placeholderTextColor={D.textMuted}
              style={{
                flex: 1,
                color: D.text,
                fontSize: 15,
                padding: 0,
              }}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery("")} hitSlop={10}>
                <Ionicons name="close-circle" size={17} color={D.textMuted} />
              </Pressable>
            )}
          </View>
        </View>

        {/* ── Pagos recientes ── */}
        {query.length === 0 && (
          <View style={{ marginBottom: 28 }}>
            <Text style={[styles.sectionLabel, { paddingHorizontal: 20 }]}>
              Pagos recientes
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
            >
              {RECIENTES.map((r) => (
                <Pressable
                  key={r.id}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? D.cardAlt : D.card,
                    borderRadius: 14,
                    padding: 14,
                    width: 130,
                    gap: 12,
                  })}
                >
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: D.surface,
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <Ionicons name={r.icon} size={17} color={D.textSub} />
                  </View>
                  <View>
                    <Text style={{ color: D.text, fontSize: 14, fontWeight: "600" }}>
                      {r.comercio}
                    </Text>
                    <Text style={{ color: D.textMuted, fontSize: 12, marginTop: 2 }}>
                      {formatMXN(r.monto)}
                    </Text>
                  </View>
                </Pressable>
              ))}

              {/* CTA Dimo */}
              <Pressable
                style={({ pressed }) => ({
                  backgroundColor: pressed ? D.cardAlt : D.card,
                  borderRadius: 14,
                  padding: 14,
                  width: 130,
                  gap: 12,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: D.sep,
                  justifyContent: "center",
                  alignItems: "center",
                })}
              >
                <Text style={{ color: D.textSub, fontSize: 13, fontWeight: "600", letterSpacing: 0.5 }}>
                  Dimo
                </Text>
                <Text style={{ color: D.textMuted, fontSize: 11, textAlign: "center" }}>
                  Paga con código QR
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        )}

        {/* ── Grid de categorías ── */}
        <View style={{ paddingHorizontal: 20 }}>
          {query.length === 0 && (
            <Text style={[styles.sectionLabel, { marginBottom: 12 }]}>
              Categorías
            </Text>
          )}

          {categoriasFiltradas.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 48 }}>
              <Ionicons name="search-outline" size={32} color={D.textMuted} style={{ marginBottom: 12 }} />
              <Text style={{ color: D.textSub, fontSize: 15, fontWeight: "500" }}>
                Sin resultados
              </Text>
              <Text style={{ color: D.textMuted, fontSize: 13, marginTop: 4 }}>
                Intenta con otro término
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {/* 2-column grid */}
              {chunk(categoriasFiltradas, 2).map((row, rowIdx) => (
                <View key={rowIdx} style={{ flexDirection: "row", gap: 8 }}>
                  {row.map((cat) => (
                    <CategoryCard key={cat.id} cat={cat} />
                  ))}
                  {/* fill last row if odd */}
                  {row.length === 1 && <View style={{ flex: 1 }} />}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Footer Dimo ── */}
        {query.length === 0 && (
          <View style={{
            alignItems: "center",
            marginTop: 28,
            paddingTop: 20,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: D.sep,
            marginHorizontal: 20,
          }}>
            <Text style={{ color: D.textMuted, fontSize: 12, letterSpacing: 0.8 }}>
              Pagos con QR disponibles vía{" "}
              <Text style={{ color: D.textSub, fontWeight: "600" }}>Dimo</Text>
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function CategoryCard({ cat }: { cat: typeof CATEGORIAS[number] }) {
  return (
    <Pressable
      style={({ pressed }) => ({
        flex: 1,
        backgroundColor: pressed ? D.cardAlt : D.card,
        borderRadius: 16,
        padding: 16,
        gap: 14,
        minHeight: 110,
      })}
    >
      <View style={{
        width: 38,
        height: 38,
        borderRadius: 11,
        backgroundColor: D.surface,
        alignItems: "center",
        justifyContent: "center",
      }}>
        <Ionicons name={cat.icon} size={18} color="rgba(255,255,255,0.75)" />
      </View>
      <View>
        <Text style={{ color: D.text, fontSize: 14, fontWeight: "600", marginBottom: 2 }}>
          {cat.label}
        </Text>
        <Text style={{ color: D.textMuted, fontSize: 11, lineHeight: 15 }} numberOfLines={2}>
          {cat.sub}
        </Text>
      </View>
    </Pressable>
  );
}

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

const styles = StyleSheet.create({
  sectionLabel: {
    color: "rgba(255,255,255,0.30)",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 10,
  },
});
