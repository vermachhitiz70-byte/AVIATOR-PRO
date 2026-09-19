"use client";
import { useState } from "react";
import Link from "next/link";
import { DataTable, MemberSearch, type LookupUser } from "@/components/admin";
import { CARD, fmtUSD } from "@/components/admin/ui";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";

type DayRow = { date: string; roi: number; level: number; reward: number; total: number };
type EarnRange = { roi: number; level: number; reward: number; total: number };

export default function AdminEarningsPage() {
  const [user, setUser] = useState<LookupUser | null>(null);
  const [ranges, setRanges] = useState<Record<string, EarnRange> | null>(null);
  const [invested, setInvested] = useState(0);
  const [days, setDays] = useState<DayRow[]>([]);
  const [page, setPage] = useState(1);
  const limit = 15;

  async function pick(u: LookupUser) {
    setUser(u);
    setPage(1);
    const [e, d] = await Promise.all([
      fetch(`/api/earnings?userId=${encodeURIComponent(u.id)}`, { credentials: "include" }).then((r) => r.json()).catch(() => null),
      fetch(`/api/admin/earnings-daily?userId=${encodeURIComponent(u.id)}&days=60`, { credentials: "include" }).then((r) => r.json()).catch(() => null),
    ]);
    if (e?.ok) { setRanges(e.ranges); setInvested(e.invested); }
    if (d?.ok) setDays(d.days || []);
  }

  const cards: [string, number][] = ranges
    ? [["Today", ranges.today?.total ?? 0], ["7 days", ranges.week?.total ?? 0], ["30 days", ranges.month?.total ?? 0], ["All time", ranges.all?.total ?? 0]]
    : [];
  const chartData = [...days].reverse();
  const paged = days.slice((page - 1) * limit, page * limit);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-3xl font-bold text-gray-900">Earnings</h1>
        <p className="mt-1 text-sm text-gray-500">Per-member ROI · Level · Reward — newest first</p>
      </div>
      <MemberSearch onPick={pick} />
      {user && (
        <>
          <div className={`${CARD} flex flex-wrap items-center justify-between gap-2 p-4`}>
            <div><p className="font-bold text-gray-900">{user.name} <span className="font-mono text-sm text-[#e8821e]">{user.referral_code}</span></p>
              <p className="text-xs text-gray-500">{user.mobile} · Invested {fmtUSD(invested)}</p></div>
            <Link href={`/admin/users?q=${encodeURIComponent(user.referral_code)}`} className="rounded-xl border border-[#e9dfc9] px-3 py-2 text-xs font-bold text-gray-600 hover:bg-[#faf6ec]">Open in Users →</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {cards.map(([k, v]) => (
              <div key={k} className={`${CARD} p-4`}><p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{k}</p>
                <p className="mt-1 text-2xl font-black text-green-700">+{fmtUSD(v)}</p></div>
            ))}
          </div>
          {chartData.length > 0 && (
            <div className={`${CARD} p-5`}>
              <h2 className="mb-3 text-base font-bold text-gray-900">Daily earnings · last {chartData.length} active days</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0e6d2" vertical={false} />
                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={{ stroke: "#e9dfc9" }} tickFormatter={(d: string) => d.slice(5)} />
                    <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #f0e6d2", borderRadius: "12px" }} formatter={(v) => fmtUSD(v)} />
                    <Legend />
                    <Bar dataKey="roi" name="Daily ROI" stackId="a" fill="#e8821e" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="level" name="Level" stackId="a" fill="#0d9488" />
                    <Bar dataKey="reward" name="Reward" stackId="a" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          <div className={CARD}>
            <DataTable
              columns={[
                { key: "date", label: "Date", render: (r: DayRow) => <b>{r.date}</b> },
                { key: "roi", label: "Daily ROI", render: (r: DayRow) => fmtUSD(r.roi) },
                { key: "level", label: "Level", render: (r: DayRow) => fmtUSD(r.level) },
                { key: "reward", label: "Reward", render: (r: DayRow) => fmtUSD(r.reward) },
                { key: "total", label: "Total", render: (r: DayRow) => <b className="text-green-700">+{fmtUSD(r.total)}</b> },
              ]}
              data={paged}
              page={page}
              limit={limit}
              total={days.length}
              onPageChange={setPage}
              onLimitChange={() => {}}
              rowKey={(r: DayRow) => r.date}
            />
          </div>
        </>
      )}
    </div>
  );
}
