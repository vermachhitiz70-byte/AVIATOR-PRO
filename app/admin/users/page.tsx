"use client";
import { useEffect, useState, useCallback } from "react";
import { DataTable, Modal, ConfirmDialog } from "@/components/admin";
import { Search, MoreVertical, Shield, Ban, UserCheck, UserX, Wallet, KeyRound, UserPlus, ChevronDown } from "lucide-react";

type UserRow = Record<string, unknown>;

const KYC_OPTIONS = ["", "pending", "approved", "rejected"];

export default function AdminUsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [kycFilter, setKycFilter] = useState("");

  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  const [creditOpen, setCreditOpen] = useState(false);
  const [debitOpen, setDebitOpen] = useState(false);
  const [sponsorOpen, setSponsorOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const [creditWallet, setCreditWallet] = useState("principal");
  const [creditAmount, setCreditAmount] = useState("");
  const [debitWallet, setDebitWallet] = useState("principal");
  const [debitAmount, setDebitAmount] = useState("");
  const [sponsorCode, setSponsorCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [blockConfirm, setBlockConfirm] = useState<{ userId: string; action: string } | null>(null);
  const [kycConfirm, setKycConfirm] = useState<{ userId: string; status: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (q) params.set("q", q);
    if (kycFilter) params.set("status", kycFilter);
    const r = await fetch(`/api/admin/users?${params}`, { credentials: "include" });
    const j = await r.json();
    if (!r.ok || j.error) { setError(j.error || "Failed to load"); setLoading(false); return; }
    setRows(j.rows || []);
    setTotal(j.total || 0);
    setLoading(false);
  }, [page, limit, q, kycFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => { const handler = () => setActionMenuOpen(null); document.addEventListener("click", handler); return () => document.removeEventListener("click", handler); }, []);

  async function postAction(body: Record<string, unknown>) {
    setSubmitting(true);
    const r = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), credentials: "include" });
    const j = await r.json();
    setSubmitting(false);
    if (!r.ok || j.error) { alert(j.error || "Action failed"); return; }
    fetchData();
  }

  function openActionModal(userId: string, type: string) {
    setActionUserId(userId);
    if (type === "credit") { setCreditWallet("principal"); setCreditAmount(""); setCreditOpen(true); }
    else if (type === "debit") { setDebitWallet("principal"); setDebitAmount(""); setDebitOpen(true); }
    else if (type === "sponsor") { setSponsorCode(""); setSponsorOpen(true); }
    else if (type === "password") { setNewPassword(""); setPasswordOpen(true); }
    setActionMenuOpen(null);
  }

  async function submitCredit() {
    if (!creditAmount || Number(creditAmount) <= 0) return;
    await postAction({ userId: actionUserId, action: "credit", amount: Number(creditAmount), wallet: creditWallet });
    setCreditOpen(false);
  }

  async function submitDebit() {
    if (!debitAmount || Number(debitAmount) <= 0) return;
    await postAction({ userId: actionUserId, action: "debit", amount: Number(debitAmount), wallet: debitWallet });
    setDebitOpen(false);
  }

  async function submitSponsor() {
    if (!sponsorCode.trim()) return;
    await postAction({ userId: actionUserId, action: "sponsor", sponsor: sponsorCode.trim() });
    setSponsorOpen(false);
  }

  async function submitPassword() {
    if (newPassword.length < 6) return;
    await postAction({ userId: actionUserId, action: "password", password: newPassword });
    setPasswordOpen(false);
  }

  function handleBlockUnblock(row: UserRow) {
    const isBlocked = row.is_blocked === 1 || row.is_blocked === true;
    setBlockConfirm({ userId: String(row.id), action: isBlocked ? "unblock" : "block" });
  }

  async function confirmBlock() {
    if (!blockConfirm) return;
    await postAction({ userId: blockConfirm.userId, action: blockConfirm.action });
    setBlockConfirm(null);
  }

  function handleKYC(row: UserRow, status: string) {
    setKycConfirm({ userId: String(row.id), status });
  }

  async function confirmKYC() {
    if (!kycConfirm) return;
    await postAction({ userId: kycConfirm.userId, action: "kyc", status: kycConfirm.status });
    setKycConfirm(null);
  }

  const columns = [
    { key: "name", label: "Name", render: (r: UserRow) => <span className="font-medium text-white">{String(r.name ?? "-")}</span> },
    { key: "email", label: "Email", render: (r: UserRow) => <span className="text-slate-300">{String(r.email ?? "-")}</span> },
    { key: "mobile", label: "Mobile", render: (r: UserRow) => <span className="text-slate-300">{String(r.mobile ?? "-")}</span> },
    { key: "referral_code", label: "Referral Code", render: (r: UserRow) => <span className="text-yellow-400 font-mono text-xs">{String(r.referral_code ?? "-")}</span> },
    { key: "kyc_status", label: "KYC", render: (r: UserRow) => {
      const s = String(r.kyc_status ?? "pending");
      const colors: Record<string, string> = { approved: "bg-emerald-500/20 text-emerald-400", pending: "bg-yellow-500/20 text-yellow-400", rejected: "bg-red-500/20 text-red-400" };
      return <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${colors[s] || "bg-white/10 text-slate-300"}`}>{s}</span>;
    }},
    { key: "is_blocked", label: "Blocked", render: (r: UserRow) => {
      const b = r.is_blocked === 1 || r.is_blocked === true;
      return <span className={b ? "text-red-400" : "text-emerald-400"}>{b ? "Yes" : "No"}</span>;
    }},
    { key: "invested", label: "Invested", render: (r: UserRow) => <span className="text-white">${Number(r.invested ?? 0).toLocaleString()}</span> },
    { key: "balance", label: "Balance", render: (r: UserRow) => {
      const b = Number(r.balance ?? 0);
      return <span className="text-yellow-400">${b.toLocaleString()}</span>;
    }},
    { key: "actions", label: "Actions", render: (r: UserRow) => (
      <div className="relative inline-block">
        <button onClick={(e) => { e.stopPropagation(); setActionMenuOpen(actionMenuOpen === String(r.id) ? null : String(r.id)); }} className="rounded-lg p-1 hover:bg-white/10"><MoreVertical className="h-4 w-4" /></button>
        {actionMenuOpen === String(r.id) && (
          <div className="absolute right-0 top-8 z-20 w-48 rounded-lg border border-white/10 bg-[#111827] shadow-2xl">
            <button onClick={() => handleBlockUnblock(r)} className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-white/5">{r.is_blocked ? <Ban className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}{r.is_blocked ? "Unblock" : "Block"}</button>
            <button onClick={() => { setKycConfirm({ userId: String(r.id), status: "approved" }); setActionMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-emerald-400 hover:bg-white/5"><UserCheck className="h-3.5 w-3.5" />KYC Approve</button>
            <button onClick={() => { setKycConfirm({ userId: String(r.id), status: "rejected" }); setActionMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-white/5"><UserX className="h-3.5 w-3.5" />KYC Reject</button>
            <button onClick={() => openActionModal(String(r.id), "credit")} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-emerald-400 hover:bg-white/5"><Wallet className="h-3.5 w-3.5" />Credit</button>
            <button onClick={() => openActionModal(String(r.id), "debit")} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-white/5"><Wallet className="h-3.5 w-3.5" />Debit</button>
            <button onClick={() => openActionModal(String(r.id), "sponsor")} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-blue-400 hover:bg-white/5"><UserPlus className="h-3.5 w-3.5" />Change Sponsor</button>
            <button onClick={() => openActionModal(String(r.id), "password")} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-yellow-400 hover:bg-white/5"><KeyRound className="h-3.5 w-3.5" />Reset Password</button>
          </div>
        )}
      </div>
    ) },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-black">Users</h2>
        <p className="text-sm text-slate-400">Manage all platform users</p>
      </div>

      <div className="av-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search name, email, mobile, referral..." className="av-input pl-9" />
          </div>
          <div className="relative">
            <select value={kycFilter} onChange={(e) => { setKycFilter(e.target.value); setPage(1); }} className="av-input pr-8">
              {KYC_OPTIONS.map((k) => <option key={k} value={k}>{k ? k.charAt(0).toUpperCase() + k.slice(1) : "All KYC"}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="av-card">
        <DataTable columns={columns} data={rows} page={page} limit={limit} total={total} onPageChange={setPage} onLimitChange={(l: number) => { setLimit(l); setPage(1); }} rowKey={(r: UserRow) => String(r.id)} />
      </div>

      {creditOpen && (
        <Modal isOpen={creditOpen} onClose={() => setCreditOpen(false)} title="Credit Wallet">
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Wallet</label>
              <select value={creditWallet} onChange={(e) => setCreditWallet(e.target.value)} className="av-input">
                {["principal", "roi", "commission", "reward"].map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Amount</label>
              <input type="number" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} placeholder="0.00" className="av-input" />
            </div>
            <button onClick={submitCredit} disabled={submitting} className="av-btn-yellow w-full rounded-lg py-2.5 text-sm">{submitting ? "Processing..." : "Credit"}</button>
          </div>
        </Modal>
      )}

      {debitOpen && (
        <Modal isOpen={debitOpen} onClose={() => setDebitOpen(false)} title="Debit Wallet">
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Wallet</label>
              <select value={debitWallet} onChange={(e) => setDebitWallet(e.target.value)} className="av-input">
                {["principal", "roi", "commission", "reward"].map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Amount</label>
              <input type="number" value={debitAmount} onChange={(e) => setDebitAmount(e.target.value)} placeholder="0.00" className="av-input" />
            </div>
            <button onClick={submitDebit} disabled={submitting} className="av-btn-yellow w-full rounded-lg py-2.5 text-sm">{submitting ? "Processing..." : "Debit"}</button>
          </div>
        </Modal>
      )}

      {sponsorOpen && (
        <Modal isOpen={sponsorOpen} onClose={() => setSponsorOpen(false)} title="Change Sponsor">
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">New Sponsor Referral Code</label>
              <input value={sponsorCode} onChange={(e) => setSponsorCode(e.target.value)} placeholder="Enter referral code" className="av-input" />
            </div>
            <button onClick={submitSponsor} disabled={submitting} className="av-btn-yellow w-full rounded-lg py-2.5 text-sm">{submitting ? "Processing..." : "Update Sponsor"}</button>
          </div>
        </Modal>
      )}

      {passwordOpen && (
        <Modal isOpen={passwordOpen} onClose={() => setPasswordOpen(false)} title="Reset Password">
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">New Password (min 6 chars)</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" className="av-input" />
            </div>
            <button onClick={submitPassword} disabled={submitting || newPassword.length < 6} className="av-btn-yellow w-full rounded-lg py-2.5 text-sm disabled:opacity-50">{submitting ? "Processing..." : "Reset Password"}</button>
          </div>
        </Modal>
      )}

      {blockConfirm && (
        <ConfirmDialog
          isOpen={!!blockConfirm}
          onClose={() => setBlockConfirm(null)}
          onConfirm={confirmBlock}
          title={blockConfirm.action === "block" ? "Block User" : "Unblock User"}
          message={`Are you sure you want to ${blockConfirm.action} this user?`}
          confirmText={blockConfirm.action === "block" ? "Block" : "Unblock"}
          destructive={blockConfirm.action === "block"}
        />
      )}

      {kycConfirm && (
        <ConfirmDialog
          isOpen={!!kycConfirm}
          onClose={() => setKycConfirm(null)}
          onConfirm={confirmKYC}
          title={`KYC ${kycConfirm.status}`}
          message={`Are you sure you want to set KYC status to "${kycConfirm.status}"?`}
          confirmText={kycConfirm.status.charAt(0).toUpperCase() + kycConfirm.status.slice(1)}
        />
      )}
    </div>
  );
}
