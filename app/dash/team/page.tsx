"use client";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

type Level = { level: number; members: { id: string; name: string; referral_code: string; investment: number }[] };
type TNode = { id: string; name: string; referral_code: string; investment: number; earned: number; children: TNode[] };

// Level colors (same language as admin tree): L1 green = DIRECT
const LV = [
  { ring: "border-emerald-400/70", bg: "bg-emerald-500", chip: "bg-emerald-400/15 text-emerald-300" },
  { ring: "border-purple-400/70", bg: "bg-purple-500", chip: "bg-purple-400/15 text-purple-300" },
  { ring: "border-orange-400/70", bg: "bg-orange-500", chip: "bg-orange-400/15 text-orange-300" },
  { ring: "border-teal-400/70", bg: "bg-teal-500", chip: "bg-teal-400/15 text-teal-300" },
  { ring: "border-sky-400/70", bg: "bg-sky-500", chip: "bg-sky-400/15 text-sky-300" },
  { ring: "border-slate-400/50", bg: "bg-slate-500", chip: "bg-slate-400/15 text-slate-300" },
];
const lv = (d: number) => LV[Math.min(d, LV.length - 1)];

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
}

function NodeCard({ n, depth, parentName, collapsed, onToggle }: { n: TNode; depth: number; parentName: string; collapsed: Set<string>; onToggle: (id: string) => void }) {
  const st = lv(depth);
  const shut = collapsed.has(n.id);
  return (
    <div className={`flex w-40 shrink-0 flex-col items-center rounded-2xl border-2 ${st.ring} bg-black/30 p-3 text-center`}>
      <span className={`flex h-10 w-10 items-center justify-center rounded-full ${st.bg} text-sm font-black text-white`}>{initials(n.name)}</span>
      <p className="mt-1.5 max-w-full truncate text-xs font-bold">{n.name}</p>
      <p className="font-mono text-[10px] font-semibold text-yellow-300">{n.referral_code}</p>
      {depth === 0
        ? <span className={`mt-1.5 rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${st.chip}`}>Level 1 · Direct</span>
        : <span className={`mt-1.5 rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${st.chip}`}>Level {depth + 1}</span>}
      {depth > 0 && <span className="mt-1 max-w-full truncate text-[10px] text-slate-400">via {parentName}</span>}
      <p className="mt-1 text-[11px] font-bold"><span className="text-emerald-300">${n.investment.toFixed(0)}</span> <span className="text-yellow-300">+${n.earned.toFixed(0)}</span></p>
      {n.children.length > 0 && (
        <button onClick={() => onToggle(n.id)} className="mt-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-300">
          {shut ? `+${n.children.length}` : "hide"}
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
      <div className="flex justify-center"><span className="h-4 w-0.5 bg-white/15" /></div>
      <div className="flex items-start justify-start gap-2.5 overflow-x-auto pb-1 md:justify-center">
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

export default function Team() {
  const [d, setD] = useState<{ name?: string; referralCode?: string; direct?: number; directCount?: number; teamTotal?: number; self?: number; team?: number; levels?: Level[]; tree?: TNode[] } | null>(null);
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  useEffect(() => {
    fetch("/api/team").then((r) => r.json()).then((j) => {
      if (j.ok) {
        setD(j);
        setLink(`${window.location.origin}/register?ref=${j.referralCode}`);
      }
    });
  }, []);
  async function copy(what: "code" | "link") {
    const { copyText } = await import("@/lib/copy");
    const ok = await copyText(what === "code" ? String(d?.referralCode || "") : link);
    setCopied(ok ? (what === "code" ? "Code copied ✓" : "Link copied ✓") : "Copy failed — long-press the text to copy");
    setTimeout(() => setCopied(""), 2500);
  }
  function toggle(id: string) {
    setCollapsed((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  const counts: number[] = [];
  const directs = Number(d?.directCount ?? 0);
  const teamBelow = Number(d?.teamTotal ?? 0);
  return (
    <div className="space-y-3">
      <div className="av-card p-4 text-center">
        <h2 className="font-black">My Network</h2>
        {d?.referralCode && <p className="mt-1 font-mono text-2xl font-black text-yellow-300">{d.referralCode}</p>}
        <p className="mt-1 break-all text-xs text-yellow-300">{link}</p>
        <div className="mt-2 flex justify-center bg-white p-2 rounded-xl">{link && <QRCodeSVG value={link} size={140} />}</div>
        <div className="mt-2 flex justify-center gap-2">
          <button onClick={() => copy("code")} className="rounded-lg bg-yellow-300 px-4 py-2 text-sm font-black text-black">Copy Code</button>
          <button onClick={() => copy("link")} className="rounded-lg border border-white/20 px-4 py-2 text-sm">Copy referral link</button>
        </div>
        {copied && <p className="mt-1.5 text-xs font-bold text-emerald-300">{copied}</p>}
      </div>

      {(d?.tree || []).length > 0 && (
        <div className="av-card overflow-x-auto p-4">
          <div className="mb-3 text-center">
            <p className="font-black">{d?.name || "My Team"}</p>
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Sponsor · root of this tree</p>
          </div>
          <div className="mx-auto mb-3 grid max-w-xl grid-cols-3 gap-2">
            <div className="rounded-2xl border border-emerald-300/30 bg-emerald-300/5 p-2.5 text-center">
              <p className="text-xl font-black text-emerald-300">{directs}</p>
              <p className="text-[10px] font-bold uppercase text-slate-400">Directs</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-2.5 text-center">
              <p className="text-xl font-black">{teamBelow}</p>
              <p className="text-[10px] font-bold uppercase text-slate-400">Team below</p>
            </div>
            <div className="rounded-2xl border border-yellow-300/30 bg-yellow-300/5 p-2.5 text-center">
              <p className="text-xl font-black text-yellow-300">{teamBelow + 1}</p>
              <p className="text-[10px] font-bold uppercase text-slate-400">Total</p>
            </div>
          </div>
          <div className="mb-2 flex flex-wrap justify-center gap-1.5 text-[10px] font-bold">
            {[["Direct", 0], ["L2", 1], ["L3", 2], ["L4", 3], ["L5+", 4]].map(([l, i]) => (
              <span key={l as string} className={`rounded-full px-2 py-0.5 ${lv(i as number).chip}`}>● {l}</span>
            ))}
          </div>
          <LevelRows nodes={d?.tree || []} depth={0} parentName={d?.name || "You"} collapsed={collapsed} onToggle={toggle} counts={counts} />
          {counts.length > 0 && (
            <p className="mt-2 text-center text-[11px] text-slate-400">
              {counts.map((c, i) => `Level ${i + 1}: ${c}`).join(" · ")}
            </p>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-lg bg-black/40 p-2">Self biz <b>${Number(d?.self || 0).toFixed(0)}</b></div>
            <div className="rounded-lg bg-black/40 p-2">Team biz <b>${Number(d?.team || 0).toFixed(0)}</b></div>
          </div>
        </div>
      )}
      {!(d?.tree || []).length && (
        <div className="av-card p-4 text-center">
          <p className="text-sm text-slate-300">No team yet. Share your link.</p>
          <div className="mx-auto mt-3 grid max-w-xl grid-cols-3 gap-2">
            <div className="rounded-2xl border border-emerald-300/30 bg-emerald-300/5 p-2.5"><p className="text-xl font-black text-emerald-300">0</p><p className="text-[10px] font-bold uppercase text-slate-400">Directs</p></div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-2.5"><p className="text-xl font-black">0</p><p className="text-[10px] font-bold uppercase text-slate-400">Team below</p></div>
            <div className="rounded-2xl border border-yellow-300/30 bg-yellow-300/5 p-2.5"><p className="text-xl font-black text-yellow-300">1</p><p className="text-[10px] font-bold uppercase text-slate-400">Total (you)</p></div>
          </div>
        </div>
      )}
    </div>
  );
}
