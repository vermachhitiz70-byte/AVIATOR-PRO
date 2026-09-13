import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

export function StatCard({ title, value, prefix = "", suffix = "", icon: Icon, trend, trendUp = true }: { title: string; value: string | number; prefix?: string; suffix?: string; icon?: LucideIcon; trend?: string; trendUp?: boolean }) {
  return (
    <div className="av-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">{title}</p>
        {Icon && <Icon className="h-4 w-4 text-slate-400" />}
      </div>
      <p className="mt-2 text-2xl font-black">
        {prefix}{typeof value === "number" ? value.toLocaleString() : value}{suffix}
      </p>
      {trend && (
        <div className={`mt-1 flex items-center gap-1 text-xs ${trendUp ? "text-emerald-400" : "text-red-400"}`}>
          {trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {trend}
        </div>
      )}
    </div>
  );
}
