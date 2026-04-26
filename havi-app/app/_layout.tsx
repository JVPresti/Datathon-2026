import "../global.css";
import { Stack } from "expo-router";
import { AlertProvider } from "../src/hooks/useAlerts";
import AlertModal from "../components/alerts/AlertModal";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet } from "react-native";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <AlertProvider>
        <StatusBar style="light" backgroundColor="#07090E" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
        <AlertModal />
      </AlertProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#07090E" },
});
