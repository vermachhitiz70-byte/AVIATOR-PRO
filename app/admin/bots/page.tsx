"use client";
import { useEffect, useState, useCallback } from "react";
import { DataTable, Modal, ConfirmDialog } from "@/components/admin";
import { BTN_PRIMARY, CARD, INPUT, LABEL, fmtDate, fmtUSD, pill } from "@/components/admin/ui";
import { Search, ChevronDown, Play, Pause, Square, Plus } from "lucide-react";

type BotRow = Record<string, unknown>;

const STATUS_OPTIONS = ["", "active", "paused", "expired", "cancelled"];
const PLAN_OPTIONS = ["", "Basic", "Pro", "Premium"];

export default function AdminBotsPage() {
  const [rows, setRows] = useState<BotRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [q, setQ] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ botId: string; action: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formUserId, setFormUserId] = useState("");
  const [formPlan, setFormPlan] = useState("Basic");
  const [formAmount, setFormAmount] = useState("");
  const [formDailyPct, setFormDailyPct] = useState("1");
  const [formExpiry, setFormExpiry] = useState("");

  const fetchData = useCallback(async () => {
    setError("");
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (statusFilter) params.set("status", statusFilter);
    if (planFilter) params.set("plan", planFilter);
    if (q) params.set("q", q);
    const r = await fetch(`/api/admin/bots?${params}`, { credentials: "include" });
    const j = await r.json();
    if (!r.ok || j.error) { setError(j.error || "Failed to load"); return; }
    setRows(j.rows || []);
    setTotal(j.total || 0);
  }, [page, limit, statusFilter, planFilter, q]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function postAction(body: Record<string, unknown>) {
    setSubmitting(true);
    const r = await fetch("/api/admin/bots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), credentials: "include" });
    const j = await r.json();
    setSubmitting(false);
    if (!r.ok || j.error) { alert(j.error || "Action failed"); return; }
    fetchData();
  }

  async function confirmBotAction() {
    if (!confirmAction) return;
    await postAction({ action: confirmAction.action, id: confirmAction.botId });
    setConfirmAction(null);
  }

  async function submitCreate() {
    if (!formUserId || !formAmount) return;
    await postAction({ action: "create", userId: formUserId, plan: formPlan, amount: Number(formAmount), daily_pct: Number(formDailyPct), expiry_date: formExpiry });
    setCreateOpen(false);
    setFormUserId(""); setFormPlan("Basic"); setFormAmount(""); setFormDailyPct("1"); setFormExpiry("");
  }

  const columns = [
    { key: "name", label: "User", render: (r: BotRow) => (<span><span className="block font-semibold text-gray-900">{String(r.name ?? "-")}</span><span className="block font-mono text-xs text-[#e8821e]">{String(r.referral_code ?? "")}</span></span>) },
    { key: "plan", label: "Plan", render: (r: BotRow) => <span className="font-semibold text-gray-900">{String(r.plan ?? "-")}</span> },
    { key: "amount", label: "Amount", render: (r: BotRow) => <span className="font-semibold text-gray-900">{fmtUSD(r.amount)}</span> },
    { key: "daily_pct", label: "Daily %", render: (r: BotRow) => <span className="font-semibold text-green-700">{Number(r.daily_pct ?? 0)}%</span> },
    { key: "start_date", label: "Start", render: (r: BotRow) => <span className="text-xs text-gray-500">{fmtDate(r.start_date)}</span> },
    { key: "expiry_date", label: "Expiry", render: (r: BotRow) => <span className="text-xs text-gray-500">{r.expiry_date ? fmtDate(r.expiry_date) : "-"}</span> },
    { key: "total_earned", label: "Earned", render: (r: BotRow) => <span className="font-bold text-green-700">{fmtUSD(r.total_earned)}</span> },
    { key: "status", label: "Status", render: (r: BotRow) => pill(r.status) },
    { key: "actions", label: "Actions", render: (r: BotRow) => {
      const s = String(r.status);
      return (
        <div className="flex gap-1.5">
          {s === "active" && <button onClick={() => setConfirmAction({ botId: String(r.id), action: "pause" })} title="Pause" className="rounded-lg bg-amber-100 p-1.5 text-amber-700 hover:bg-amber-200"><Pause className="h-3.5 w-3.5" /></button>}
          {s === "paused" && <button onClick={() => setConfirmAction({ botId: String(r.id), action: "resume" })} title="Resume" className="rounded-lg bg-green-100 p-1.5 text-green-700 hover:bg-green-200"><Play className="h-3.5 w-3.5" /></button>}
          {(s === "active" || s === "paused") && <button onClick={() => setConfirmAction({ botId: String(r.id), action: "cancel" })} title="Cancel" className="rounded-lg bg-red-100 p-1.5 text-red-600 hover:bg-red-200"><Square className="h-3.5 w-3.5" /></button>}
        </div>
      );
    } },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold text-gray-900">Bots</h1>
          <p className="mt-1 text-sm text-gray-500">Full lifecycle: create, pause, resume, cancel · {total} total</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 rounded-xl bg-[#e8821e] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#d1710f]"><Plus className="h-4 w-4" />Create Bot</button>
      </div>

      <div className={`${CARD} p-4`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search user, email, referral..." className={`${INPUT} pl-9`} />
          </div>
          <div className="relative">
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className={`${INPUT} pr-8`}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : "All Status"}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
          <div className="relative">
            <select value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }} className={`${INPUT} pr-8`}>
              {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{p || "All Plans"}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p>}

      <div className={CARD}>
        <DataTable columns={columns} data={rows} page={page} limit={limit} total={total} onPageChange={setPage} onLimitChange={(l: number) => { setLimit(l); setPage(1); }} rowKey={(r: BotRow) => String(r.id)} />
      </div>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create Bot (admin only)">
        <div className="space-y-4">
          <div><label className={LABEL}>User ID or referral code</label>
            <input value={formUserId} onChange={(e) => setFormUserId(e.target.value)} placeholder="e.g. AV100002" className={INPUT} /></div>
          <div><label className={LABEL}>Plan</label>
            <select value={formPlan} onChange={(e) => setFormPlan(e.target.value)} className={INPUT}>{["Basic", "Pro", "Premium"].map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={LABEL}>Amount (USD)</label>
              <input type="number" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} placeholder="0.00" className={INPUT} /></div>
            <div><label className={LABEL}>Daily %</label>
              <input type="number" value={formDailyPct} onChange={(e) => setFormDailyPct(e.target.value)} placeholder="1" className={INPUT} /></div>
          </div>
          <div><label className={LABEL}>Expiry date (optional)</label>
            <input type="date" value={formExpiry} onChange={(e) => setFormExpiry(e.target.value)} className={INPUT} /></div>
          <button onClick={submitCreate} disabled={submitting || !formUserId || !formAmount} className={`${BTN_PRIMARY} w-full`}>{submitting ? "Creating..." : "Create Bot"}</button>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} onConfirm={confirmBotAction}
        title={`${confirmAction?.action === "cancel" ? "Cancel" : confirmAction?.action === "pause" ? "Pause" : "Resume"} Bot`}
        message={`Are you sure you want to ${confirmAction?.action} this bot?`}
        confirmText="Confirm" destructive={confirmAction?.action === "cancel"} />
    </div>
  );
}
