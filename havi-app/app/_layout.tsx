import "../global.css";
import { Stack } from "expo-router";
import { AlertProvider } from "../src/hooks/useAlerts";
import AlertModal from "../components/alerts/AlertModal";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet } from "react-native";
import { ToastProvider } from "../src/hooks/useToast";
import { ToastContainer } from "../components/ui/Toast";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <ToastProvider>
        <AlertProvider>
          <StatusBar style="light" backgroundColor="#000000" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
          </Stack>
          <AlertModal />
          <ToastContainer />
        </AlertProvider>
      </ToastProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
});
