"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MemberSearch, type LookupUser } from "@/components/admin";
import { CARD } from "@/components/admin/ui";

type TNode = { id: string; name: string; referral_code: string; investment: number; earned: number; children: TNode[] };

// Level colors (photo-style): L1 green = DIRECT, then purple / orange / teal / blue…
const LEVEL_STYLE = [
  { ring: "border-emerald-400", bg: "bg-emerald-500", soft: "bg-emerald-50", text: "text-emerald-700" },
  { ring: "border-purple-400", bg: "bg-purple-500", soft: "bg-purple-50", text: "text-purple-700" },
  { ring: "border-orange-400", bg: "bg-orange-500", soft: "bg-orange-50", text: "text-orange-700" },
  { ring: "border-teal-400", bg: "bg-teal-500", soft: "bg-teal-50", text: "text-teal-700" },
  { ring: "border-sky-400", bg: "bg-sky-500", soft: "bg-sky-50", text: "text-sky-700" },
  { ring: "border-gray-300", bg: "bg-gray-400", soft: "bg-gray-50", text: "text-gray-600" },
];
const styleFor = (depth: number) => LEVEL_STYLE[Math.min(depth, LEVEL_STYLE.length - 1)];

function NodeCard({ n, depth, parentName, collapsed, onToggle }: { n: TNode; depth: number; parentName: string; collapsed: Set<string>; onToggle: (id: string) => void }) {
  const st = styleFor(depth);
  const initials = n.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  const isCollapsed = collapsed.has(n.id);
  const levelNo = depth + 1;
  return (
    <div className={`flex w-44 shrink-0 flex-col items-center rounded-2xl border-2 ${st.ring} bg-white p-3 text-center shadow-sm`}>
      <span className={`flex h-12 w-12 items-center justify-center rounded-full ${st.bg} text-base font-black text-white`}>{initials}</span>
      <Link href={`/admin/users?q=${encodeURIComponent(n.referral_code)}`} className="mt-1.5 truncate text-sm font-bold text-gray-900 hover:text-[#e8821e] hover:underline" title="Open in Users">
        {n.name}
      </Link>
      <span className="font-mono text-[11px] font-semibold text-[#e8821e]">{n.referral_code}</span>
      {depth === 0 ? (
        <span className={`mt-1.5 rounded-full ${st.soft} px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${st.text}`}>Level {levelNo} · Direct</span>
      ) : (
        <span className={`mt-1.5 rounded-full ${st.soft} px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${st.text}`}>Level {levelNo}</span>
      )}
      {depth > 0 && <span className="mt-1 max-w-full truncate text-[10px] text-gray-400" title={`Referred by ${parentName}`}>via {parentName}</span>}
      <span className="mt-1 text-[11px] font-semibold text-gray-700">${n.investment.toFixed(0)} <span className="text-green-700">+${n.earned.toFixed(0)}</span></span>
      {n.children.length > 0 && (
        <button onClick={() => onToggle(n.id)} className="mt-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-bold text-gray-600 hover:bg-gray-200">
          {isCollapsed ? `+${n.children.length} show` : "hide"}
        </button>
      )}
    </div>
  );
}

function LevelRows({ nodes, depth, parentName, collapsed, onToggle, counts }: { nodes: TNode[]; depth: number; parentName: string; collapsed: Set<string>; onToggle: (id: string) => void; counts: number[] }) {
  if (!nodes.length) return null;
  counts[depth] = (counts[depth] || 0) + nodes.length;
  return (
    <>
      <div className="flex justify-center"><span className="h-5 w-0.5 bg-[#e9dfc9]" /></div>
      <div className="flex items-start justify-start gap-3 overflow-x-auto pb-2 md:justify-center">
        {nodes.map((n) => (
          <NodeCard key={n.id} n={n} depth={depth} parentName={parentName} collapsed={collapsed} onToggle={onToggle} />
        ))}
      </div>
      {nodes.map((n) =>
        !collapsed.has(n.id) && n.children.length > 0 ? (
          <LevelRows key={n.id} nodes={n.children} depth={depth + 1} parentName={n.name} collapsed={collapsed} onToggle={onToggle} counts={counts} />
        ) : null
      )}
    </>
  );
}

function AdminTreeInner() {
  const sp = useSearchParams();
  const [root, setRoot] = useState<{ user: LookupUser; tree: TNode[]; directCount: number; teamTotal: number } | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState("");

  async function pick(u: LookupUser) {
    setCollapsed(new Set());
    setMsg("");
    const j = await fetch(`/api/team?userId=${encodeURIComponent(u.id)}`, { credentials: "include" }).then((r) => r.json()).catch(() => null);
    if (!j?.ok) { setMsg("Tree load failed"); setRoot(null); return; }
    setRoot({ user: u, tree: j.tree || [], directCount: Number(j.directCount ?? 0), teamTotal: Number(j.teamTotal ?? 0) });
    if ((j.tree || []).length === 0) setMsg("Iske neeche koi member nahi — koi direct nahi joda.");
  }

  // Deep-link from Rewards page: /admin/tree?pick=<code|mobile|name>
  useEffect(() => {
    const q = (sp.get("pick") || "").trim();
    if (!q || root) return;
    fetch(`/api/admin/lookup?q=${encodeURIComponent(q)}`, { credentials: "include" })
      .then((r) => r.json())
      .then((j) => { if (j.ok && j.rows?.length) pick(j.rows[0]); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);
  function toggle(id: string) {
    setCollapsed((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  const counts: number[] = [];
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-3xl font-bold text-gray-900">Referral Tree</h1>
        <p className="mt-1 text-sm text-gray-500">Search karo → us bande se neeche ka poora ped. Green = Direct</p>
      </div>
      <MemberSearch onPick={pick} />
      {root && <p className="-mb-2 text-xs text-gray-400">Showing tree for <b>{root.user.name}</b> — search upar se badal sakte ho.</p>}
      {msg && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">{msg}</p>}
      {root && (
        <div className={`${CARD} overflow-x-auto p-5`}>
          <div className="mb-4 flex items-center justify-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1d1d2e] text-lg font-black text-white">
              {root.user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
            </span>
            <div className="text-center">
              <p className="font-black text-gray-900">{root.user.name} <span className="font-mono text-sm text-[#e8821e]">{root.user.referral_code}</span></p>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Sponsor · root of this tree</p>
            </div>
          </div>
          <div className="mx-auto mb-4 grid max-w-2xl grid-cols-3 gap-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-center">
              <p className="text-2xl font-black text-emerald-700">{root.directCount}</p>
              <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-600">Directs (khud jode)</p>
            </div>
            <div className="rounded-2xl border border-[#f0e6d2] bg-[#faf6ec] p-3 text-center">
              <p className="text-2xl font-black text-gray-900">{root.teamTotal}</p>
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Team below (sab milakar)</p>
            </div>
            <div className="rounded-2xl border border-[#e9dfc9] bg-white p-3 text-center">
              <p className="text-2xl font-black text-[#e8821e]">{root.teamTotal + 1}</p>
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Total (self + team)</p>
            </div>
          </div>
          <div className="mb-3 flex flex-wrap justify-center gap-2 text-[10px] font-bold">
            {["Direct", "L2", "L3", "L4", "L5+"].map((l, i) => {
              const st = styleFor(i);
              return <span key={l} className={`rounded-full ${st.soft} px-2.5 py-1 ${st.text}`}>● {l}{i === 0 ? " (seedha joda)" : ""}</span>;
            })}
          </div>
          <LevelRows nodes={root.tree} depth={0} parentName={root.user.name} collapsed={collapsed} onToggle={toggle} counts={counts} />
          {counts.length > 0 && (
            <p className="mt-3 text-center text-xs text-gray-500">
              {counts.map((c, i) => `Level ${i + 1}: ${c}`).join(" · ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminTreePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading tree…</div>}>
      <AdminTreeInner />
    </Suspense>
  );
}
