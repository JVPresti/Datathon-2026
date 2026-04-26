import "../global.css";
import { Stack } from "expo-router";
import { AlertProvider, useAlerts } from "../src/hooks/useAlerts";
import AlertModal from "../components/alerts/AlertModal";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet } from "react-native";
import { ToastProvider } from "../src/hooks/useToast";
import { ToastContainer } from "../components/ui/Toast";
import { HaviContextProvider, useHaviContext } from "../src/hooks/useHaviContext";
import { ALERTAS_MOCK } from "../src/data/mockData";
import { useEffect } from "react";

/**
 * PipelineAlertsSync — lives inside both HaviContextProvider and AlertProvider.
 * When the pipeline loads real alerts, it replaces the mock alerts in the store.
 */
function PipelineAlertsSync() {
  const { pipelineAlerts, isConnected, userId } = useHaviContext();
  const { resetAlerts } = useAlerts();

  useEffect(() => {
    if (isConnected && pipelineAlerts.length > 0) {
      resetAlerts(pipelineAlerts);
    } else {
      const filtered = ALERTAS_MOCK.filter(a => {
        if (userId === "USR-15022") return true; // Default user sees all for demo purposes
        const targetUserId = a.uc1_context?.user_id || a.uc3_context?.user_id || a.uc4_context?.user_id;
        return targetUserId === userId;
      });
      resetAlerts(filtered);
    }
  }, [isConnected, pipelineAlerts, resetAlerts, userId]);

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <ToastProvider>
        <HaviContextProvider>
          <AlertProvider>
            <PipelineAlertsSync />
            <StatusBar style="light" backgroundColor="#000000" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
            </Stack>
            <AlertModal />
            <ToastContainer />
          </AlertProvider>
        </HaviContextProvider>
      </ToastProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
});
