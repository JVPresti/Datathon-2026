import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAlerts } from "../../src/hooks/useAlerts";
import { LinearGradient } from "expo-linear-gradient";

export default function TabLayout() {
  const { unreadCount } = useAlerts();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: "#FFFFFF",
        tabBarInactiveTintColor: "rgba(255,255,255,0.35)",
        tabBarLabelStyle: styles.tabLabel,
        tabBarActiveBackgroundColor: "transparent",
        tabBarInactiveBackgroundColor: "transparent",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="movements"
        options={{
          title: "Movimientos",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "bar-chart" : "bar-chart-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Havi",
          tabBarIcon: () => (
            <LinearGradient
              colors={["#FF6B9D", "#FF9A3C", "#FFDD57", "#56C596", "#3FA9F5", "#A78BFA", "#FF6B9D"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.haviButton}
            >
              <Text style={styles.haviIcon}>✦</Text>
            </LinearGradient>
          ),
          tabBarLabel: () => <Text style={styles.haviLabel}>Havi</Text>,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: "Alertas",
          tabBarIcon: ({ color, focused }) => (
            <View>
              <Ionicons
                name={focused ? "notifications" : "notifications-outline"}
                size={22}
                color={color}
              />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 9 ? "9+" : String(unreadCount)}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#111111",
    borderTopColor: "rgba(255,255,255,0.08)",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: 10,
    paddingTop: 10,
    height: 74,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
    letterSpacing: 0.2,
  },
  haviButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -16,
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  haviIcon: {
    fontSize: 19,
    color: "#FFFFFF",
  },
  haviLabel: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 10,
    fontWeight: "500",
    marginTop: 4,
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -7,
    backgroundColor: "#FF453A",
    borderRadius: 7,
    minWidth: 14,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#111111",
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
  },
});
