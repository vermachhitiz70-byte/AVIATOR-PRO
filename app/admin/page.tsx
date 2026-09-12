"use client";
import { useEffect, useState } from "react";

type Tab = "overview" | "users" | "deposits" | "withdrawals" | "settings" | "reports" | "campaigns";

export default function Admin() {
  const [tab, setTab] = useState<Tab>("overview");
  const [denied, setDenied] = useState(false);
  const [ov, setOv] = useState<Record<string, number> | null>(null);
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [q, setQ] = useState("");
  const [deps, setDeps] = useState<Record<string, unknown>[]>([]);
  const [wds, setWds] = useState<Record<string, unknown>[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [rep, setRep] = useState<Record<string, number> | null>(null);
  const [camps, setCamps] = useState<Record<string, unknown>[]>([]);
  const [achievers, setAchievers] = useState<Record<string, unknown>[]>([]);
  const [msg, setMsg] = useState("");

  async function load(t: Tab) {
    setMsg("");
    if (t === "overview") {
      const j = await fetch("/api/admin/overview").then((r) => r.json());
      if (j.error) { setDenied(true); return; }
      setOv(j);
    }
    if (t === "users") {
      const j = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`).then((r) => r.json());
      if (j.ok) setUsers(j.rows);
    }
    if (t === "deposits") {
      const j = await fetch("/api/admin/deposits?status=pending").then((r) => r.json());
      if (j.ok) setDeps(j.rows);
    }
    if (t === "withdrawals") {
      const j = await fetch("/api/admin/withdrawals?status=pending").then((r) => r.json());
      if (j.ok) setWds(j.rows);
    }
    if (t === "settings") {
      const j = await fetch("/api/admin/settings").then((r) => r.json());
      if (j.ok) setSettings(j.settings);
    }
    if (t === "reports") {
      const j = await fetch("/api/admin/reports").then((r) => r.json());
      if (j.ok) setRep(j);
    }
    if (t === "campaigns") {
      const j = await fetch("/api/admin/campaigns").then((r) => r.json());
      if (j.ok) { setCamps(j.campaigns); setAchievers(j.achievers); }
    }
  }
  useEffect(() => { load("overview"); }, []);
  function switchTab(t: Tab) { setTab(t); load(t); }

  async function act(url: string, body: object, okMsg: string) {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    setMsg(j.ok ? okMsg : j.error || "Failed");
    if (j.ok) load(tab);
  }

  if (denied) return <div className="p-6">Admin only. Login as admin@aviatorpro.local</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-3 p-4">
      <h1 className="text-2xl font-black">Admin Panel</h1>
      <div className="flex flex-wrap gap-2">
        {(["overview", "users", "deposits", "withdrawals", "campaigns", "settings", "reports"] as Tab[]).map((t) => (
          <button key={t} onClick={() => switchTab(t)} className={`rounded-lg px-3 py-2 text-sm font-bold ${tab === t ? "av-btn-yellow" : "av-card"}`}>{t.toUpperCase()}</button>
        ))}
      </div>
      {msg && <p className="rounded-lg bg-yellow-100 p-2 text-sm text-black">{msg}</p>}

      {tab === "overview" && ov && (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {[["Users", ov.users], ["Active bots", ov.bots ?? 0], ["Investment $", ov.deposits ?? 0], ["Withdrawals $", ov.withdrawals ?? 0], ["Pending deposits", 0]].map(([a, b]) => (
            <div key={a as string} className="av-card p-3 text-center"><p className="text-xs text-slate-400">{a}</p><p className="text-xl font-black">{String(b)}</p></div>
          ))}
          <div className="av-card p-3 text-center"><p className="text-xs text-slate-400">Pending withdrawals</p><p className="text-xl font-black">{(ov.pendingWithdrawals as unknown as unknown[] || []).length}</p></div>
        </div>
      )}

      {tab === "users" && (
        <div className="av-card space-y-2 p-4">
          <div className="flex gap-2"><input className="av-input" placeholder="Search name/email/mobile/ID" value={q} onChange={(e) => setQ(e.target.value)} /><button onClick={() => load("users")} className="av-btn-yellow px-4">Search</button></div>
          {users.map((u: Record<string, unknown>) => (
            <div key={String(u.id)} className="rounded-lg bg-black/30 p-2 text-xs">
              <p><b>{String(u.name)}</b> · {String(u.email)} · {String(u.mobile)} · <span className="text-yellow-300">{String(u.referral_code)}</span> · KYC {String(u.kyc_status)} · {u.is_blocked ? <b className="text-red-400">BLOCKED</b> : "active"} · Inv ${Number(u.invested || 0).toFixed(0)} · Bal ${Number(u.balance || 0).toFixed(0)}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                <button onClick={() => act("/api/admin/users", { userId: u.id, action: u.is_blocked ? "unblock" : "block" }, "Done")} className="rounded border border-white/20 px-2 py-1">{u.is_blocked ? "Unblock" : "Block"}</button>
                <button onClick={() => act("/api/admin/users", { userId: u.id, action: "kyc", status: "approved" }, "KYC approved")} className="rounded border border-white/20 px-2 py-1">KYC ✓</button>
                <button onClick={() => act("/api/admin/users", { userId: u.id, action: "kyc", status: "rejected" }, "KYC rejected")} className="rounded border border-white/20 px-2 py-1">KYC ✗</button>
                <button onClick={() => { const a = prompt("Credit amount (principal)?"); if (a) act("/api/admin/users", { userId: u.id, action: "credit", amount: Number(a), wallet: "principal" }, "Credited"); }} className="rounded border border-white/20 px-2 py-1">Credit+</button>
                <button onClick={() => { const a = prompt("Debit amount (principal)?"); if (a) act("/api/admin/users", { userId: u.id, action: "debit", amount: Number(a), wallet: "principal" }, "Debited"); }} className="rounded border border-white/20 px-2 py-1">Debit−</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "deposits" && (
        <div className="av-card space-y-2 p-4">
          <h2 className="font-bold">Pending deposits (approve → credits Principal + 5-level commission)</h2>
          {deps.map((d: Record<string, unknown>) => (
            <div key={String(d.id)} className="rounded-lg bg-black/30 p-2 text-xs">
              <p><b>{String(d.name)}</b> · {String(d.request_id)} · ${Number(d.actual).toFixed(2)} · TX <span className="break-all">{String(d.tx_hash).slice(0, 20)}…</span></p>
              <div className="mt-1 flex gap-1">
                <button onClick={() => act("/api/admin/deposits", { id: d.id, action: "approve" }, "Approved + credited")} className="av-btn-yellow px-3 py-1">Approve</button>
                <button onClick={() => { const r = prompt("Reject remark?") || ""; act("/api/admin/deposits", { id: d.id, action: "reject", remark: r }, "Rejected"); }} className="rounded border border-white/20 px-3 py-1">Reject</button>
              </div>
            </div>
          ))}
          {!deps.length && <p className="text-sm text-slate-400">No pending deposits.</p>}
        </div>
      )}

      {tab === "withdrawals" && (
        <div className="av-card space-y-2 p-4">
          <h2 className="font-bold">Pending withdrawals (reject → refunds debit)</h2>
          {wds.map((w: Record<string, unknown>) => (
            <div key={String(w.id)} className="rounded-lg bg-black/30 p-2 text-xs">
              <p><b>{String(w.name)}</b> · debit ${Number(w.debit).toFixed(2)} · net ${Number(w.net).toFixed(2)} · <span className="break-all">{String(w.address).slice(0, 20)}…</span></p>
              <div className="mt-1 flex gap-1">
                <button onClick={() => act("/api/admin/withdrawals", { id: w.id, action: "approve" }, "Marked paid")} className="av-btn-yellow px-3 py-1">Approve/Paid</button>
                <button onClick={() => { const r = prompt("Reject remark?") || ""; act("/api/admin/withdrawals", { id: w.id, action: "reject", remark: r }, "Rejected + refunded"); }} className="rounded border border-white/20 px-3 py-1">Reject</button>
              </div>
            </div>
          ))}
          {!wds.length && <p className="text-sm text-slate-400">No pending withdrawals.</p>}
        </div>
      )}

      {tab === "settings" && (
        <div className="av-card space-y-2 p-4">
          <h2 className="font-bold">Platform settings</h2>
          {Object.entries(settings).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2 text-sm"><label className="w-44 text-slate-300">{k}</label><input className="av-input" value={v} onChange={(e) => setSettings({ ...settings, [k]: e.target.value })} /></div>
          ))}
          <button onClick={() => act("/api/admin/settings", { all: settings }, "Settings saved")} className="av-btn-yellow px-5 py-2">Save all</button>
          <p className="text-xs text-slate-400">ROI cron: call <b>/api/cron/roi?secret=CRON_SECRET</b> daily (Vercel Cron). SMTP fields enable real OTP emails; until then OTPs show in dev mode.</p>
        </div>
      )}

      {tab === "reports" && rep && (
        <div className="av-card space-y-2 p-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[["Users", rep.users], ["Today users", rep.todayUsers], ["Total investment", rep.totalInvestment], ["Today investment", rep.todayInvestment], ["Withdrawals", rep.totalWithdrawal], ["ROI paid", rep.roiPaid], ["Commission paid", rep.commissionPaid], ["Pending deposits", rep.pendingDeposits], ["Pending withdrawals", rep.pendingWithdrawals]].map(([a, b]) => (
              <div key={a as string} className="rounded-lg bg-black/30 p-2"><p className="text-slate-400">{a}</p><p className="font-black">{Number(b).toFixed(a as string === "Users" || (a as string).startsWith("Today") || (a as string).startsWith("Pending") ? 0 : 2)}</p></div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            {(["users", "deposits", "withdrawals", "commissions"] as const).map((t) => (<a key={t} href={`/api/admin/reports?export=${t}`} className="rounded-lg border border-white/20 px-3 py-2">Export {t} CSV</a>))}
          </div>
        </div>
      )}

      {tab === "campaigns" && (
        <div className="space-y-3">
          {camps.map((c: Record<string, unknown>) => (
            <div key={String(c.id)} className="av-card space-y-2 p-4">
              <div className="grid gap-2 text-sm md:grid-cols-2">
                <div><label className="text-slate-400">Name</label><input className="av-input" defaultValue={String(c.name)} id={`cn-${c.id}`} /></div>
                <div><label className="text-slate-400">Location</label><input className="av-input" defaultValue={String(c.location)} id={`cl-${c.id}`} /></div>
                <div><label className="text-slate-400">Meeting date</label><input className="av-input" defaultValue={String(c.meeting_date)} id={`cm-${c.id}`} /></div>
                <div><label className="text-slate-400">Eligibility end</label><input className="av-input" defaultValue={String(c.eligibility_end)} id={`ce-${c.id}`} /></div>
              </div>
              <div><label className="text-slate-400">Criteria JSON</label><textarea className="av-input font-mono text-xs" rows={4} defaultValue={String(c.criteria_json)} id={`cj-${c.id}`} /></div>
              <div className="flex flex-wrap gap-2 text-sm">
                <button onClick={() => {
                  const v = (p: string) => (document.getElementById(p) as HTMLInputElement).value;
                  let crit: unknown = undefined;
                  try { crit = JSON.parse(v(`cj-${c.id}`)); } catch { setMsg("Bad criteria JSON"); return; }
                  act("/api/admin/campaigns", { action: "update", id: c.id, name: v(`cn-${c.id}`), location: v(`cl-${c.id}`), meeting_date: v(`cm-${c.id}`), eligibility_end: v(`ce-${c.id}`), status: "active", criteria: crit }, "Campaign saved");
                }} className="av-btn-yellow px-4 py-1">Save</button>
                <button onClick={() => act("/api/admin/campaigns", { action: "clearDemo", id: c.id }, "Demo rows cleared")} className="rounded border border-white/20 px-3 py-1">Clear demo board</button>
                <button onClick={() => { if (confirm("Delete campaign?")) act("/api/admin/campaigns", { action: "delete", id: c.id }, "Deleted"); }} className="rounded border border-red-400/50 px-3 py-1 text-red-300">Delete</button>
              </div>
            </div>
          ))}
          <button onClick={() => act("/api/admin/campaigns", { action: "create", name: "New Campaign", location: "", meeting_date: "", eligibility_end: "" }, "Created")} className="av-btn-yellow px-4 py-2">+ New campaign</button>
          <div className="av-card p-4">
            <h2 className="font-bold">Achievers ({achievers.length})</h2>
            <div className="mt-2 space-y-1 text-xs">
              {achievers.map((a: Record<string, unknown>) => (
                <p key={String(a.id)} className="flex justify-between rounded bg-black/30 px-2 py-1.5">
                  <span><b>{String(a.name)}</b> · {String(a.country)} · {String(a.user_code)} · ${Number(a.earned).toLocaleString()}{a.is_demo ? " (demo)" : ""}</span>
                  <button onClick={() => act("/api/admin/campaigns", { action: "deleteAchiever", id: a.id }, "Removed")} className="text-red-300">Remove</button>
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
