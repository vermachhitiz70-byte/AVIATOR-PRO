"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { DataTable } from "@/components/admin";
import { CARD, fmtUSD } from "@/components/admin/ui";
import { MILESTONES } from "@/lib/config";

type MU = {
  id: string; name: string; email: string; mobile: string; referral_code: string;
  self: number; direct: number; team: number; directs: number; teamTotal: number;
  claimed: number[]; ready: number[];
};

const TIER_NAME = new Map(MILESTONES.map((m) => [m.tier, m.name]));

export default function AdminRewardsPage() {
  const [tab, setTab] = useState<"claimed" | "unclaimed">("unclaimed");
  const [rows, setRows] = useState<MU[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/milestones", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => { if (j.ok) setRows(j.users || []); })
      .finally(() => setLoading(false));
  }, []);

  const claimedRows = rows.filter((r) => r.claimed.length > 0);
  const unclaimedRows = rows.filter((r) => r.ready.length > 0);
  const shown = tab === "claimed" ? claimedRows : unclaimedRows;
  const tierChips = (tiers: number[], cls: string) => (
    <span className="flex flex-wrap gap-1">
      {tiers.map((t) => (
        <span key={t} className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${cls}`} title={TIER_NAME.get(t) || `Tier ${t}`}>
          T{t} · {(TIER_NAME.get(t) || "").split(" ")[0]}
        </span>
      ))}
    </span>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-3xl font-bold text-gray-900">Reward Milestones</h1>
        <p className="mt-1 text-sm text-gray-500">Kiska clear hua, claimed ya pending — full table</p>
      </div>

      <div className={`${CARD} p-2`}>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setTab("claimed")} className={`rounded-xl px-4 py-3 text-sm font-black transition ${tab === "claimed" ? "bg-green-600 text-white shadow" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
            ✓ Claimed ({claimedRows.length})
          </button>
          <button onClick={() => setTab("unclaimed")} className={`rounded-xl px-4 py-3 text-sm font-black transition ${tab === "unclaimed" ? "bg-amber-500 text-white shadow" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
            ⏳ Unclaimed — ready to claim ({unclaimedRows.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className={CARD}><p className="p-8 text-center text-sm text-gray-400">Loading…</p></div>
      ) : (
        <div className={CARD}>
          <DataTable
            columns={[
              { key: "name", label: "User", render: (r: MU) => (<span><span className="block font-semibold text-gray-900">{r.name}</span><span className="block font-mono text-xs text-[#e8821e]">{r.referral_code}</span><span className="block text-[11px] text-gray-500">{r.mobile}</span></span>) },
              { key: "biz", label: "Self / Direct / Team", render: (r: MU) => (<span className="text-xs text-gray-600">S ${r.self.toFixed(0)}<br />D ${r.direct.toFixed(0)}<br />T ${r.team >= 1000 ? (r.team / 1000).toFixed(r.team >= 1000000 ? 1 : 0) + "K" : r.team.toFixed(0)}</span>) },
              { key: "counts", label: "Directs / Team", render: (r: MU) => (<span className="font-bold text-gray-900">{r.directs} / {r.teamTotal}</span>) },
              tab === "claimed"
                ? { key: "tiers", label: "Claimed tiers", render: (r: MU) => tierChips(r.claimed, "bg-green-100 text-green-800") }
                : { key: "tiers", label: "Ready tiers", render: (r: MU) => tierChips(r.ready, "bg-amber-100 text-amber-800") },
              {
                key: "tree", label: "Tree", render: (r: MU) => (
                  <Link href={`/admin/tree?pick=${encodeURIComponent(r.referral_code)}`} className="inline-block whitespace-nowrap rounded-lg bg-[#1c1917] px-3 py-1.5 text-xs font-bold text-white hover:bg-black">
                    View Tree →
                  </Link>
                ),
              },
            ]}
            data={shown}
            page={1}
            limit={shown.length || 1}
            total={shown.length}
            onPageChange={() => {}}
            onLimitChange={() => {}}
            rowKey={(r: MU) => r.id}
          />
          {shown.length === 0 && <p className="p-8 text-center text-sm text-gray-400">{tab === "claimed" ? "Abhi kisi ne claim nahi kiya." : "Koi pending milestone nahi — sab claimed ya locked."}</p>}
        </div>
      )}
    </div>
  );
}
