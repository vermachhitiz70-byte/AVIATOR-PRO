"use client";
import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type Notification = { id: string; text: string; time: string };

type NotifCtx = { notifications: Notification[]; add: (text: string) => void };

const NotifContext = createContext<NotifCtx>({ notifications: [], add: () => {} });

export function useNotif() { return useContext(NotifContext); }

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const add = useCallback((text: string) => {
    const id = Date.now().toString();
    const now = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
    setNotifications((prev) => [{ id, text, time: now }, ...prev].slice(0, 50));
  }, []);
  return <NotifContext.Provider value={{ notifications, add }}>{children}</NotifContext.Provider>;
}
