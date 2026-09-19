"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import { CARD, INPUT } from "./ui";

export type LookupUser = { id: string; name: string; email: string; mobile: string; referral_code: string; match: string };

// Shared exact member search (name exact / mobile exact / referral code).
// Used by Earnings, Money Trail and Tree pages.
export function MemberSearch({ onPick, placeholder }: { onPick: (u: LookupUser) => void; placeholder?: string }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<LookupUser[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function search() {
    const query = q.trim();
    if (!query) return;
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch(`/api/admin/lookup?q=${encodeURIComponent(query)}`, { credentials: "include" });
      const j = await r.json();
      if (!j.ok) { setMsg(j.error || "Search failed"); setRows([]); return; }
      setRows(j.rows || []);
      if ((j.rows || []).length === 0) setMsg("No member found — exact name, mobile or referral code dalo.");
      else if (j.rows.length === 1) onPick(j.rows[0]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`${CARD} p-4`}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") search(); }}
            placeholder={placeholder || "Exact name, mobile ya referral code (e.g. AV100001)…"}
            className={`${INPUT} pl-9`}
          />
        </div>
        <button onClick={search} disabled={busy} className="rounded-xl bg-[#e8821e] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#d1710f] disabled:opacity-50">
          {busy ? "…" : "Search"}
        </button>
      </div>
      {msg && <p className="mt-2 text-sm text-gray-500">{msg}</p>}
      {rows.length > 1 && (
        <div className="mt-3 space-y-1.5">
          {rows.map((r) => (
            <button key={r.id} onClick={() => onPick(r)} className="flex w-full items-center justify-between rounded-xl bg-[#faf6ec] px-4 py-2.5 text-left hover:bg-[#f5eddc]">
              <span><b className="text-sm text-gray-900">{r.name}</b> <span className="font-mono text-xs text-[#e8821e]">{r.referral_code}</span> <span className="text-xs text-gray-500">{r.mobile}</span></span>
              <span className="text-xs text-gray-400">matched: {r.match}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
