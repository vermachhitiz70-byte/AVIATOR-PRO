import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";

const TINTS: Record<string, string> = {
  orange: "bg-orange-100 text-[#e8821e]",
  green: "bg-green-100 text-green-600",
  teal: "bg-teal-100 text-teal-600",
  purple: "bg-purple-100 text-purple-600",
  blue: "bg-blue-100 text-blue-600",
  red: "bg-red-100 text-red-600",
};

export function StatCard({ title, value, prefix = "", icon: Icon, tint = "orange", trend }: { title: string; value: string | number; prefix?: string; icon?: LucideIcon; tint?: keyof typeof TINTS | string; trend?: string }) {
  const up = trend ? !trend.trim().startsWith("-") : true;
  return (
    <div className="rounded-2xl border border-[#f0e6d2] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      <div className="flex items-start justify-between">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${TINTS[tint] ?? TINTS.orange}`}>
          {Icon && <Icon className="h-5 w-5" />}
        </span>
        {trend && (
          <span className={`flex items-center gap-1 text-xs font-semibold ${up ? "text-green-600" : "text-red-500"}`}>
            {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {trend}
          </span>
        )}
      </div>
      <p className="mt-4 text-3xl font-bold tabular-nums text-gray-900">
        {prefix}{typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="mt-1 text-sm text-gray-500">{title}</p>
    </div>
  );
}
