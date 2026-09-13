"use client";
import { useEffect, useState, useCallback } from "react";
import { DataTable, Modal, ConfirmDialog } from "@/components/admin";
import { BTN_GHOST, BTN_PRIMARY, CARD, INPUT, LABEL, fmtUSD, pill } from "@/components/admin/ui";
import { Search, MoreVertical, Shield, Ban, UserCheck, UserX, Wallet, KeyRound, UserPlus, ChevronDown } from "lucide-react";

type UserRow = Record<string, unknown>;

const KYC_OPTIONS = ["", "pending", "approved", "rejected"];

export default function AdminUsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
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
    setActionMenuOpen(null);
  }
  async function confirmBlock() {
    if (!blockConfirm) return;
    await postAction({ userId: blockConfirm.userId, action: blockConfirm.action });
    setBlockConfirm(null);
  }
  async function confirmKYC() {
    if (!kycConfirm) return;
    await postAction({ userId: kycConfirm.userId, action: "kyc", status: kycConfirm.status });
    setKycConfirm(null);
  }

  const columns = [
    { key: "name", label: "User", render: (r: UserRow) => (<span><span className="block font-semibold text-gray-900">{String(r.name ?? "-")}</span><span className="block text-xs text-gray-500">{String(r.email ?? "")}</span></span>) },
    { key: "mobile", label: "Mobile", render: (r: UserRow) => <span className="text-gray-600">{String(r.mobile ?? "-")}</span> },
    { key: "referral_code", label: "Referral Code", render: (r: UserRow) => <span className="font-mono text-xs font-semibold text-[#e8821e]">{String(r.referral_code ?? "-")}</span> },
    { key: "kyc_status", label: "KYC", render: (r: UserRow) => pill(r.kyc_status ?? "pending") },
    { key: "is_blocked", label: "Status", render: (r: UserRow) => { const b = r.is_blocked === 1 || r.is_blocked === true; return pill(b ? "cancelled" : "active"); } },
    { key: "invested", label: "Invested", render: (r: UserRow) => <span className="font-semibold text-gray-900">{fmtUSD(r.invested)}</span> },
    { key: "balance", label: "Balance", render: (r: UserRow) => <span className="font-bold text-[#e8821e]">{fmtUSD(r.balance)}</span> },
    { key: "actions", label: "Actions", render: (r: UserRow) => (
      <div className="relative inline-block">
        <button onClick={(e) => { e.stopPropagation(); setActionMenuOpen(actionMenuOpen === String(r.id) ? null : String(r.id)); }} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"><MoreVertical className="h-4 w-4" /></button>
        {actionMenuOpen === String(r.id) && (
          <div className="absolute right-0 top-8 z-20 w-48 overflow-hidden rounded-xl border border-[#f0e6d2] bg-white shadow-xl">
            <button onClick={() => handleBlockUnblock(r)} className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-[#faf6ee]">{r.is_blocked ? <Ban className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}{r.is_blocked ? "Unblock" : "Block"}</button>
            <button onClick={() => { setKycConfirm({ userId: String(r.id), status: "approved" }); setActionMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-green-700 hover:bg-green-50"><UserCheck className="h-3.5 w-3.5" />KYC Approve</button>
            <button onClick={() => { setKycConfirm({ userId: String(r.id), status: "rejected" }); setActionMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"><UserX className="h-3.5 w-3.5" />KYC Reject</button>
            <button onClick={() => openActionModal(String(r.id), "credit")} className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-green-700 hover:bg-green-50"><Wallet className="h-3.5 w-3.5" />Credit Wallet</button>
            <button onClick={() => openActionModal(String(r.id), "debit")} className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"><Wallet className="h-3.5 w-3.5" />Debit Wallet</button>
            <button onClick={() => openActionModal(String(r.id), "sponsor")} className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50"><UserPlus className="h-3.5 w-3.5" />Change Sponsor</button>
            <button onClick={() => openActionModal(String(r.id), "password")} className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-[#b45309] hover:bg-orange-50"><KeyRound className="h-3.5 w-3.5" />Reset Password</button>
          </div>
        )}
      </div>
    ) },
  ];

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

      <Modal isOpen={passwordOpen} onClose={() => setPasswordOpen(false)} title="Reset Password">
        <div className="space-y-4">
          <div><label className={LABEL}>New password (min 6 characters)</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" className={INPUT} /></div>
          <button onClick={submitPassword} disabled={submitting || newPassword.length < 6} className={`${BTN_PRIMARY} w-full py-2.5`}>{submitting ? "Processing..." : "Reset Password"}</button>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!blockConfirm} onClose={() => setBlockConfirm(null)} onConfirm={confirmBlock}
        title={blockConfirm?.action === "block" ? "Block User" : "Unblock User"}
        message={`Are you sure you want to ${blockConfirm?.action} this user?`}
        confirmText={blockConfirm?.action === "block" ? "Block" : "Unblock"} destructive={blockConfirm?.action === "block"} />

      <ConfirmDialog isOpen={!!kycConfirm} onClose={() => setKycConfirm(null)} onConfirm={confirmKYC}
        title={`KYC ${kycConfirm?.status}`}
        message={`Set this user's KYC status to "${kycConfirm?.status}"?`}
        confirmText="Confirm" />
    </div>
  );
}
