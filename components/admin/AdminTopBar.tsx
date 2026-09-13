"use client";
import { useState, useEffect } from "react";
import { Search, Bell, Clock } from "lucide-react";
import { useNotif } from "./NotificationContext";

export function AdminTopBar({ admin }: { admin: { name: string; email: string } }) {
  const { notifications } = useNotif();
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Kolkata" }));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b0f19]/80 backdrop-blur">
      <div className="flex items-center justify-between px-4 py-3 md:px-6">
        <div className="hidden lg:block" />
        <div className="flex flex-1 items-center justify-end gap-3 md:gap-4">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Global search..." className="rounded-lg border border-white/10 bg-white/5 py-1.5 pl-9 pr-4 text-sm placeholder:text-slate-400 focus:border-yellow-500/50 focus:outline-none" />
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300">
            <Clock className="h-3.5 w-3.5" />
            {time} IST
          </div>
          <div className="relative">
            <Bell className="h-5 w-5 cursor-pointer text-slate-300 hover:text-white" />
            {notifications.length > 0 && <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-500 text-[10px] font-bold text-black">{notifications.length}</span>}
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500/20 text-sm font-bold text-yellow-400">{admin.name?.[0]?.toUpperCase() || "A"}</div>
            <span className="text-sm font-medium">{admin.name}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
