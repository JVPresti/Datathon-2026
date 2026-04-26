// ============================================================
// ALERT STORE — React Context para gestión de alertas
// ============================================================

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { HaviAlert } from "../types";
import { ALERTAS_MOCK } from "../data/mockData";

interface AlertStore {
  alerts: HaviAlert[];
  activeAlert: HaviAlert | null;
  unreadCount: number;
  showAlert: (alert: HaviAlert) => void;
  dismissAlert: () => void;
  markAsRead: (id: string) => void;
  markAsActioned: (id: string) => void;
  addAlert: (alert: HaviAlert) => void;
}

const AlertContext = createContext<AlertStore | null>(null);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<HaviAlert[]>(ALERTAS_MOCK);
  const [activeAlert, setActiveAlert] = useState<HaviAlert | null>(null);

  const unreadCount = alerts.filter((a) => !a.leida).length;

  const showAlert = useCallback((alert: HaviAlert) => {
    setActiveAlert(alert);
  }, []);

  const dismissAlert = useCallback(() => {
    setActiveAlert(null);
  }, []);

  const markAsRead = useCallback((id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, leida: true } : a))
    );
  }, []);

  const markAsActioned = useCallback((id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, accionada: true, leida: true } : a))
    );
  }, []);

  const addAlert = useCallback((alert: HaviAlert) => {
    setAlerts((prev) => [alert, ...prev]);
    // Auto-show alta prioridad
    if (alert.priority === "alta") {
      setActiveAlert(alert);
    }
  }, []);

  return (
    <AlertContext.Provider
      value={{ alerts, activeAlert, unreadCount, showAlert, dismissAlert, markAsRead, markAsActioned, addAlert }}
    >
      {children}
    </AlertContext.Provider>
  );
}

export function useAlerts() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error("useAlerts must be used within AlertProvider");
  return ctx;
}
