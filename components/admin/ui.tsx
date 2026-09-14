export const INPUT = "w-full rounded-xl border border-[#e9dfc9] bg-white px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#e8821e] focus:outline-none focus:ring-2 focus:ring-[#e8821e]/20";
export const BTN_PRIMARY = "rounded-xl bg-[#e8821e] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#d1710f] disabled:opacity-50";
export const BTN_GREEN = "rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-green-700 disabled:opacity-50";
export const BTN_RED = "rounded-xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-600 disabled:opacity-50";
export const BTN_GHOST = "rounded-xl border border-[#e9dfc9] bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-[#faf6ec]";
export const CARD = "rounded-2xl border border-[#f0e6d2] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)]";
export const LABEL = "mb-1 block text-xs font-semibold text-gray-500";

const PILL_MAP: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  open: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  approved: "bg-green-100 text-green-700",
  confirmed: "bg-green-100 text-green-700",
  closed: "bg-gray-200 text-gray-600",
  rejected: "bg-red-100 text-red-600",
  cancelled: "bg-red-100 text-red-600",
  paused: "bg-amber-100 text-amber-700",
  expired: "bg-gray-200 text-gray-500",
  inactive: "bg-gray-200 text-gray-500",
};

export function pill(status: unknown) {
  const s = String(status ?? "-").toLowerCase();
  return <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${PILL_MAP[s] ?? "bg-gray-100 text-gray-600"}`}>{String(status ?? "-")}</span>;
}

export function fmtUSD(v: unknown) {
  return `$${Number(v ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function fmtDate(v: unknown) {
  try {
    return new Date(String(v)).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "-";
  }
}
