"use client";
import { useEffect, useState, useCallback } from "react";
import { DataTable, Modal, ConfirmDialog } from "@/components/admin";
import { BTN_PRIMARY, CARD, INPUT, LABEL, fmtUSD, pill } from "@/components/admin/ui";
import { Search, Eye, ChevronDown } from "lucide-react";
import { MILESTONES } from "@/lib/config";

type UserRow = Record<string, unknown>;
type EarnRange = { roi: number; level: number; reward: number; total: number };
type TNode = { id: string; name: string; referral_code: string; investment: number; earned: number; children: TNode[] };

const KYC_OPTIONS = ["", "pending", "approved", "rejected"];
const str = (v: unknown) => String(v ?? "-");

function AdminTreeNode({ n, depth }: { n: TNode; depth: number }) {
  const [open, setOpen] = useState(depth < 2);
  return (
    <div className={depth > 0 ? "ml-3 border-l border-[#f0e6d2] pl-2" : ""}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between rounded-lg bg-gray-50 px-2 py-1.5 text-left text-xs hover:bg-gray-100">
        <span className="font-semibold text-gray-800">{n.children.length ? (open ? "▾ " : "▸ ") : "• "}{n.name} · <span className="font-mono text-[#e8821e]">{n.referral_code}</span></span>
        <span className="shrink-0"><span className="font-bold text-gray-900">${n.investment.toFixed(0)}</span><span className="ml-2 font-bold text-green-700">+${n.earned.toFixed(0)}</span></span>
      </button>
      {open && <div className="mt-1 space-y-1">{n.children.map((c) => <AdminTreeNode key={c.id} n={c} depth={depth + 1} />)}</div>}
    </div>
  );
}

export default function AdminUsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [kycFilter, setKycFilter] = useState("");

  const [detail, setDetail] = useState<UserRow | null>(null);
  const [earn, setEarn] = useState<{ ranges: Record<string, EarnRange>; invested: number } | null>(null);
  const [tree, setTree] = useState<TNode[]>([]);
  const [mst, setMst] = useState<{ self: number; direct: number; team: number; claimed: number[] } | null>(null);
  const [trail, setTrail] = useState<{ summary: { invested: number; earned: number; balance: number }; events: { ts: string; label: string; detail: string; amount: number | null }[] } | null>(null);
  const [trailAll, setTrailAll] = useState(false);

  useEffect(() => {
    if (!detail) { setEarn(null); setTree([]); setTrail(null); setTrailAll(false); setMst(null); return; }
    const id = String(detail.id);
    fetch(`/api/earnings?userId=${encodeURIComponent(id)}`, { credentials: "include" }).then((r) => r.json()).then((j) => { if (j.ok) setEarn({ ranges: j.ranges, invested: j.invested }); }).catch(() => {});
    fetch(`/api/team?userId=${encodeURIComponent(id)}`, { credentials: "include" }).then((r) => r.json()).then((j) => { if (j.ok) { setTree(j.tree || []); setMst({ self: Number(j.self || 0), direct: Number(j.direct || 0), team: Number(j.team || 0), claimed: j.claimed || [] }); } }).catch(() => {});
    fetch(`/api/admin/money-trail?userId=${encodeURIComponent(id)}`, { credentials: "include" }).then((r) => r.json()).then((j) => { if (j.ok) setTrail({ summary: j.summary, events: j.events }); }).catch(() => {});
  }, [detail]);

  const [creditOpen, setCreditOpen] = useState(false);
  const [debitOpen, setDebitOpen] = useState(false);
  const [sponsorOpen, setSponsorOpen] = useState(false);

  const [creditWallet, setCreditWallet] = useState("principal");
  const [creditAmount, setCreditAmount] = useState("");
  const [debitWallet, setDebitWallet] = useState("principal");
  const [debitAmount, setDebitAmount] = useState("");
  const [sponsorCode, setSponsorCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [suspendConfirm, setSuspendConfirm] = useState<{ userId: string; suspend: boolean } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ userId: string; name: string } | null>(null);
  const [kycConfirm, setKycConfirm] = useState<{ userId: string; status: string } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initial = params.get("q");
    if (initial) setQ(initial);
  }, []);

  const fetchData = useCallback(async () => {
    setError("");
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (q) params.set("q", q);
    if (kycFilter) params.set("status", kycFilter);
    const r = await fetch(`/api/admin/users?${params}`, { credentials: "include" });
    const j = await r.json();
    if (!r.ok || j.error) { setError(j.error || "Failed to load"); return; }
    setRows(j.rows || []);
    setTotal(j.total || 0);
    // keep open detail modal in sync
    setDetail((d) => (d ? (j.rows || []).find((x: UserRow) => String(x.id) === String(d.id)) || d : d));
  }, [page, limit, q, kycFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function postAction(body: Record<string, unknown>) {
    setSubmitting(true);
    const r = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), credentials: "include" });
    const j = await r.json();
    setSubmitting(false);
    if (!r.ok || j.error) { alert(j.error || "Action failed"); return false; }
    await fetchData();
    return true;
  }

  async function submitCredit() {
    if (!detail || !creditAmount || Number(creditAmount) <= 0) return;
    if (await postAction({ userId: String(detail.id), action: "credit", amount: Number(creditAmount), wallet: creditWallet })) setCreditOpen(false);
  }
  async function submitDebit() {
    if (!detail || !debitAmount || Number(debitAmount) <= 0) return;
    if (await postAction({ userId: String(detail.id), action: "debit", amount: Number(debitAmount), wallet: debitWallet })) setDebitOpen(false);
  }
  async function submitSponsor() {
    if (!detail || !sponsorCode.trim()) return;
    if (await postAction({ userId: String(detail.id), action: "sponsor", sponsor: sponsorCode.trim() })) setSponsorOpen(false);
  }
  async function submitPassword() {
    if (!detail || newPassword.length < 6) return;
    setPwMsg("");
    if (await postAction({ userId: String(detail.id), action: "password", password: newPassword })) {
      setPwMsg("Password reset successful. Share it with the user securely.");
      setNewPassword("");
    }
  }
  async function confirmSuspend() {
    if (!suspendConfirm) return;
    const ok = await postAction({ userId: suspendConfirm.userId, action: suspendConfirm.suspend ? "block" : "unblock" });
    setSuspendConfirm(null);
    if (ok && suspendConfirm.suspend) setDetail(null);
  }
  async function confirmDelete() {
    if (!deleteConfirm) return;
    const ok = await postAction({ userId: deleteConfirm.userId, action: "delete" });
    setDeleteConfirm(null);
    if (ok) setDetail(null);
  }
  async function confirmKYC() {
    if (!kycConfirm) return;
    await postAction({ userId: kycConfirm.userId, action: "kyc", status: kycConfirm.status });
    setKycConfirm(null);
  }

  const isSuspended = (r: UserRow) => r.is_blocked === 1 || r.is_blocked === true;
  const isAdmin = (r: UserRow) => r.is_admin === 1 || r.is_admin === true;

  const columns = [
    { key: "name", label: "User", render: (r: UserRow) => (<span><span className="block font-semibold text-gray-900">{str(r.name)}</span><span className="block text-xs text-gray-500">{str(r.email)}</span></span>) },
    { key: "mobile", label: "Mobile", render: (r: UserRow) => <span className="text-gray-600">{str(r.mobile)}</span> },
    { key: "referral_code", label: "Referral Code", render: (r: UserRow) => <span className="font-mono text-xs font-semibold text-[#e8821e]">{str(r.referral_code)}</span> },
    { key: "kyc_status", label: "KYC", render: (r: UserRow) => pill(str(r.kyc_status || "pending")) },
    { key: "is_blocked", label: "Status", render: (r: UserRow) => pill(isSuspended(r) ? "cancelled" : "active") },
    { key: "invested", label: "Invested", render: (r: UserRow) => <span className="font-semibold text-gray-900">{fmtUSD(r.invested)}</span> },
    { key: "balance", label: "Balance", render: (r: UserRow) => <span className="font-bold text-[#e8821e]">{fmtUSD(r.balance)}</span> },
    { key: "actions", label: "Actions", render: (r: UserRow) => (
      <button onClick={() => { setDetail(r); setPwMsg(""); setNewPassword(""); }} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1c1917] px-3 py-1.5 text-xs font-semibold text-white hover:bg-black">
        <Eye className="h-3.5 w-3.5" /> View Details
      </button>
    ) },
  ];

  const d = detail;
  const dSuspended = d ? isSuspended(d) : false;
  const dAdmin = d ? isAdmin(d) : false;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-3xl font-bold text-gray-900">Users</h1>
        <p className="mt-1 text-sm text-gray-500">Manage all platform members · {total} total</p>
      </div>

      <div className={`${CARD} p-4`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search name, email, mobile, referral..." className={`${INPUT} pl-9`} />
          </div>
          <div className="relative">
            <select value={kycFilter} onChange={(e) => { setKycFilter(e.target.value); setPage(1); }} className={`${INPUT} pr-8`}>
              {KYC_OPTIONS.map((k) => <option key={k} value={k}>{k ? k.charAt(0).toUpperCase() + k.slice(1) : "All KYC"}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p>}

      <div className={CARD}>
        <DataTable columns={columns} data={rows} page={page} limit={limit} total={total} onPageChange={setPage} onLimitChange={(l: number) => { setLimit(l); setPage(1); }} rowKey={(r: UserRow) => String(r.id)} />
      </div>

      {/* Details modal */}
      <Modal isOpen={!!d} onClose={() => setDetail(null)} title={d ? `User Details — ${str(d.name)}` : "User Details"}>
        {d && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[["Name", str(d.name)], ["Email", str(d.email)], ["Mobile", str(d.mobile)], ["Country", str(d.country || "-")],
                ["Referral Code", str(d.referral_code)], ["Sponsored By", str(d.referred_by || "-")], ["Rank", str(d.rank || "Starter")],
                ["KYC", str(d.kyc_status || "pending")], ["Status", dSuspended ? "Suspended" : "Active"],
                ["Invested", fmtUSD(d.invested)], ["Balance", fmtUSD(d.balance)],
                ["Joined", str(d.created_at).slice(0, 16).replace("T", " ")]].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-gray-50 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{k}</p>
                  <p className="mt-0.5 break-all font-semibold text-gray-900">{v}</p>
                </div>
              ))}
            </div>

            {/* Earnings: today / 7d / 30d / total */}
            {earn && (
              <div className="rounded-xl border border-[#f0e6d2] p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Earnings — Daily ROI / Level / Reward (invested {fmtUSD(earn.invested)})</p>
                <table className="mt-2 w-full text-xs">
                  <thead><tr className="text-left text-gray-400"><th className="py-1">Range</th><th className="text-right">ROI</th><th className="text-right">Level</th><th className="text-right">Reward</th><th className="text-right">Total</th></tr></thead>
                  <tbody>
                    {[["today", "Today"], ["week", "7 days"], ["month", "30 days"], ["all", "All time"]].map(([k, label]) => {
                      const r = earn.ranges[k];
                      if (!r) return null;
                      return (<tr key={k} className="border-t border-gray-100 font-semibold text-gray-800"><td className="py-1.5">{label}</td><td className="text-right">${r.roi.toFixed(2)}</td><td className="text-right">${r.level.toFixed(2)}</td><td className="text-right">${r.reward.toFixed(2)}</td><td className="text-right font-bold text-green-700">+${r.total.toFixed(2)}</td></tr>);
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Money trail: full timestamps — how every rupee came, total now */}
            {trail && trail.events.length > 0 && (
              <div className="rounded-xl border border-[#f0e6d2] p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  Money trail · In ${trail.summary.invested.toFixed(0)} · Earned +${trail.summary.earned.toFixed(2)} · Balance ${trail.summary.balance.toFixed(2)}
                </p>
                <div className="mt-2 space-y-1">
                  {(trailAll ? trail.events : trail.events.slice(0, 7)).map((h, i) => {
                    const neg = h.amount !== null && Number(h.amount) < 0;
                    return (
                      <div key={i} className="rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-gray-800">{h.label}</span>
                          {h.amount !== null && <b className={neg ? "text-red-600" : "text-green-700"}>{neg ? "−" : "+"}${Math.abs(Number(h.amount)).toFixed(2)}</b>}
                        </div>
                        <p className="mt-0.5 break-all text-[11px] text-gray-500">{str(h.ts).slice(0, 19).replace("T", " ")} · {h.detail}</p>
                      </div>
                    );
                  })}
                </div>
                {trail.events.length > 7 && (
                  <button onClick={() => setTrailAll((v) => !v)} className="mt-2 w-full rounded-lg border border-[#e9dfc9] px-3 py-1.5 text-xs font-bold text-[#b45309] hover:bg-[#faf6ec]">
                    {trailAll ? "Show less" : `View all (${trail.events.length})`}
                  </button>
                )}
              </div>
            )}

            {/* Milestones: achieved / claimable / locked at a glance */}
            {mst && (
              <div className="rounded-xl border border-[#f0e6d2] p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  Milestones · Self ${mst.self.toFixed(0)} · Direct ${mst.direct.toFixed(0)} · Team ${mst.team.toFixed(0)}
                </p>
                <div className="mt-2 grid max-h-48 grid-cols-1 gap-1 overflow-y-auto">
                  {MILESTONES.map((m) => {
                    const done = mst.self >= m.self && mst.direct >= m.direct && mst.team >= m.team;
                    const claimed = mst.claimed.includes(m.tier);
                    return (
                      <div key={m.tier} className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs ${claimed ? "bg-green-50" : done ? "bg-amber-50" : "bg-gray-50"}`}>
                        <span className="font-semibold text-gray-800">{m.tier}. {m.name} <span className="font-normal text-gray-500">· S${m.self}/D${m.direct}/T${m.team >= 1000000 ? (m.team / 10000000) + "cr" : m.team >= 100000 ? (m.team / 100000) + "L" : m.team >= 1000 ? (m.team / 1000) + "K" : m.team} · ${m.wallet}</span></span>
                        <b className={claimed ? "text-green-700" : done ? "text-amber-600" : "text-gray-400"}>{claimed ? "CLAIMED" : done ? "READY (user can claim)" : "locked"}</b>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Referral tree */}
            {tree.length > 0 && (
              <div className="rounded-xl border border-[#f0e6d2] p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Referral tree <span className="font-normal normal-case">$ invested · +$ earned</span></p>
                <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
                  {tree.map((n) => <AdminTreeNode key={n.id} n={n} depth={0} />)}
                </div>
              </div>
            )}

            {/* Password: hashed, cannot be viewed — reset instead */}
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-3">
              <p className="text-xs font-bold text-[#9a3412]">Password (encrypted — cannot be viewed)</p>
              <div className="mt-2 flex gap-2">
                <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Set new password (min 6 chars)" className={INPUT} />
                <button onClick={submitPassword} disabled={submitting || newPassword.length < 6} className={`${BTN_PRIMARY} whitespace-nowrap px-4 disabled:opacity-50`}>
                  {submitting ? "..." : "Reset"}
                </button>
              </div>
              {pwMsg && <p className="mt-1.5 text-xs font-semibold text-green-700">{pwMsg}</p>}
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => { setKycConfirm({ userId: String(d.id), status: "approved" }); }} className="rounded-lg bg-green-100 px-3 py-2 text-xs font-bold text-green-800 hover:bg-green-200">KYC Approve</button>
              <button onClick={() => { setKycConfirm({ userId: String(d.id), status: "rejected" }); }} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100">KYC Reject</button>
              <button onClick={() => { setCreditAmount(""); setCreditOpen(true); }} className="rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white hover:bg-green-700">Credit</button>
              <button onClick={() => { setDebitAmount(""); setDebitOpen(true); }} className="rounded-lg bg-gray-200 px-3 py-2 text-xs font-bold text-gray-800 hover:bg-gray-300">Debit</button>
              <button onClick={() => { setSponsorCode(""); setSponsorOpen(true); }} className="rounded-lg bg-blue-100 px-3 py-2 text-xs font-bold text-blue-800 hover:bg-blue-200">Sponsor</button>
            </div>

            {!dAdmin && (
              <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                <button
                  onClick={() => setSuspendConfirm({ userId: String(d.id), suspend: !dSuspended })}
                  className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold ${dSuspended ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-amber-500 text-white hover:bg-amber-600"}`}>
                  {dSuspended ? "Unsuspend Account" : "Suspend Account"}
                </button>
                <button
                  onClick={() => setDeleteConfirm({ userId: String(d.id), name: str(d.name) })}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700">
                  Remove Account
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={creditOpen} onClose={() => setCreditOpen(false)} title="Credit Wallet">
        <div className="space-y-4">
          <div><label className={LABEL}>Wallet</label>
            <select value={creditWallet} onChange={(e) => setCreditWallet(e.target.value)} className={INPUT}>{["principal", "roi", "commission", "reward"].map((w) => <option key={w} value={w}>{w}</option>)}</select></div>
          <div><label className={LABEL}>Amount (USD)</label>
            <input type="number" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} placeholder="0.00" className={INPUT} /></div>
          <button onClick={submitCredit} disabled={submitting} className={`${BTN_PRIMARY} w-full py-2.5`}>{submitting ? "Processing..." : "Credit Wallet"}</button>
        </div>
      </Modal>

      <Modal isOpen={debitOpen} onClose={() => setDebitOpen(false)} title="Debit Wallet">
        <div className="space-y-4">
          <div><label className={LABEL}>Wallet</label>
            <select value={debitWallet} onChange={(e) => setDebitWallet(e.target.value)} className={INPUT}>{["principal", "roi", "commission", "reward"].map((w) => <option key={w} value={w}>{w}</option>)}</select></div>
          <div><label className={LABEL}>Amount (USD)</label>
            <input type="number" value={debitAmount} onChange={(e) => setDebitAmount(e.target.value)} placeholder="0.00" className={INPUT} /></div>
          <button onClick={submitDebit} disabled={submitting} className={`${BTN_PRIMARY} w-full py-2.5`}>{submitting ? "Processing..." : "Debit Wallet"}</button>
        </div>
      </Modal>

      <Modal isOpen={sponsorOpen} onClose={() => setSponsorOpen(false)} title="Change Sponsor">
        <div className="space-y-4">
          <div><label className={LABEL}>New sponsor referral code</label>
            <input value={sponsorCode} onChange={(e) => setSponsorCode(e.target.value)} placeholder="e.g. AV100001" className={INPUT} /></div>
          <button onClick={submitSponsor} disabled={submitting} className={`${BTN_PRIMARY} w-full py-2.5`}>{submitting ? "Processing..." : "Update Sponsor"}</button>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!suspendConfirm} onClose={() => setSuspendConfirm(null)} onConfirm={confirmSuspend}
        title={suspendConfirm?.suspend ? "Suspend this ID?" : "Unsuspend this ID?"}
        message={suspendConfirm?.suspend
          ? "Do you want to suspend this ID? Login, dashboard aur trading turant band ho jayenge. Upline/downline tables par koi farak nahi padega. Unsuspend karke wapas khola ja sakta hai."
          : "Do you want to unsuspend this ID? User ko turant full access wapas mil jayega."}
        confirmText={suspendConfirm?.suspend ? "Suspend" : "Unsuspend"} destructive={!!suspendConfirm?.suspend}
        requireConsent={!!suspendConfirm?.suspend} consentText="I consent to suspend this ID and all consequences that follow." />

      <ConfirmDialog isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} onConfirm={confirmDelete}
        title="Terminate / Remove this ID?"
        message={`Do you want to terminate "${deleteConfirm?.name}"? ID hamesha ke liye database se gayab ho jayegi (deposits, bots, trades, commissions, ledger — sab). Upline/downline tables par koi farak nahi padega. Ye UNDO nahi hoga.`}
        confirmText="Remove Forever" destructive
        requireConsent consentText="I consent to remove this ID permanently and all consequences that follow." />

      <ConfirmDialog isOpen={!!kycConfirm} onClose={() => setKycConfirm(null)} onConfirm={confirmKYC}
        title={`KYC ${kycConfirm?.status}`}
        message={`Set this user's KYC status to "${kycConfirm?.status}"?`}
        confirmText="Confirm" />
    </div>
  );
}
