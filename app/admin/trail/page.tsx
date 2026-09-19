"use client";
import { useState } from "react";
import Link from "next/link";
import { DataTable, MemberSearch, type LookupUser } from "@/components/admin";
import { CARD } from "@/components/admin/ui";

type TrailEv = {
  ts: string; label: string; detail: string; amount: number | null;
  date: string; time: string; wallet: string;
  fromName: string; fromCode: string; pct: number | null; levelNum: number | null;
};

export default function AdminTrailPage() {
  const [user, setUser] = useState<LookupUser | null>(null);
  const [events, setEvents] = useState<TrailEv[]>([]);
  const [summary, setSummary] = useState<{ invested: number; earned: number; balance: number } | null>(null);
  const [page, setPage] = useState(1);
  const limit = 25;

  async function pick(u: LookupUser) {
    setUser(u);
    setPage(1);
    const j = await fetch(`/api/admin/money-trail?userId=${encodeURIComponent(u.id)}`, { credentials: "include" }).then((r) => r.json()).catch(() => null);
    if (j?.ok) { setEvents(j.events || []); setSummary(j.summary); }
  }

  const paged = events.slice((page - 1) * limit, page * limit);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-3xl font-bold text-gray-900">Money Trail</h1>
        <p className="mt-1 text-sm text-gray-500">Har paisa: date · time · kisse · % · level · wallet — newest sabse upar</p>
      </div>
      <MemberSearch onPick={pick} />
      {user && (
        <>
          <div className={`${CARD} flex flex-wrap items-center justify-between gap-2 p-4`}>
            <div><p className="font-bold text-gray-900">{user.name} <span className="font-mono text-sm text-[#e8821e]">{user.referral_code}</span></p>
              {summary && <p className="text-xs text-gray-500">In ${summary.invested.toFixed(0)} · Earned +${summary.earned.toFixed(2)} · Balance ${summary.balance.toFixed(2)}</p>}</div>
            <Link href={`/admin/users?q=${encodeURIComponent(user.referral_code)}`} className="rounded-xl border border-[#e9dfc9] px-3 py-2 text-xs font-bold text-gray-600 hover:bg-[#faf6ec]">Open in Users →</Link>
          </div>
          <div className={CARD}>
            <DataTable
              columns={[
                { key: "date", label: "Date", render: (r: TrailEv) => <span className="whitespace-nowrap font-semibold">{r.date}</span> },
                { key: "time", label: "Time", render: (r: TrailEv) => <span className="whitespace-nowrap text-gray-500">{r.time}</span> },
                { key: "label", label: "Event", render: (r: TrailEv) => (<span><b className="block text-gray-900">{r.label}</b><span className="block max-w-[260px] truncate text-[11px] text-gray-500" title={r.detail}>{r.detail}</span></span>) },
                { key: "from", label: "From", render: (r: TrailEv) => (r.fromName === "—" ? <span className="text-gray-300">—</span> : <span><b className="block text-gray-900">{r.fromName}</b><span className="font-mono text-[11px] text-[#e8821e]">{r.fromCode}</span></span>) },
                { key: "pct", label: "%", render: (r: TrailEv) => (r.pct === null ? <span className="text-gray-300">—</span> : `${r.pct}%`) },
                { key: "level", label: "Level", render: (r: TrailEv) => (r.levelNum === null ? <span className="text-gray-300">—</span> : `L${r.levelNum}`) },
                { key: "wallet", label: "Wallet", render: (r: TrailEv) => <span className="text-xs capitalize text-gray-600">{r.wallet}</span> },
                {
                  key: "amount", label: "Amount", render: (r: TrailEv) => (r.amount === null ? <span className="text-gray-300">—</span> :
                    <b className={r.amount < 0 ? "text-red-600" : "text-green-700"}>{r.amount < 0 ? "−" : "+"}${Math.abs(r.amount).toFixed(2)}</b>),
                },
              ]}
              data={paged}
              page={page}
              limit={limit}
              total={events.length}
              onPageChange={setPage}
              onLimitChange={() => {}}
              rowKey={(r: TrailEv, i?: number) => `${r.ts}-${i}`}
            />
          </div>
        </>
      )}
    </div>
  );
}
