import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAlerts } from "../../src/hooks/useAlerts";
import { LinearGradient } from "expo-linear-gradient";

const D = {
  bg: "#07090E",
  tabBar: "#0D1018",
  border: "rgba(255,255,255,0.07)",
  active: "#06B6D4",
  inactive: "rgba(239,246,255,0.28)",
  label: "rgba(239,246,255,0.45)",
  labelActive: "#06B6D4",
};

export default function TabLayout() {
  const { unreadCount } = useAlerts();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: D.active,
        tabBarInactiveTintColor: D.inactive,
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
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="movements"
        options={{
          title: "Movimientos",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "bar-chart" : "bar-chart-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Havi",
          tabBarIcon: () => (
            <LinearGradient
              colors={["#06B6D4", "#818CF8", "#A855F7"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.haviButton}
            >
              <Text style={styles.haviIcon}>✦</Text>
            </LinearGradient>
          ),
          tabBarLabel: () => (
            <Text style={styles.haviLabel}>Havi</Text>
          ),
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
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: D.tabBar,
    borderTopColor: D.border,
    borderTopWidth: 1,
    paddingBottom: 10,
    paddingTop: 10,
    height: 74,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
    letterSpacing: 0.3,
  },
  haviButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -18,
    shadowColor: "#06B6D4",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 10,
  },
  haviIcon: {
    fontSize: 20,
    color: "#FFFFFF",
  },
  haviLabel: {
    color: "#818CF8",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 4,
    letterSpacing: 0.3,
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -7,
    backgroundColor: "#F87171",
    borderRadius: 7,
    minWidth: 14,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: D.tabBar,
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
  },
});
