"use client";
import { useEffect, useState, useCallback } from "react";
import { DataTable, Modal, ConfirmDialog } from "@/components/admin";
import { Search, ChevronDown, Play, Pause, Square, Eye, Plus, Loader2 } from "lucide-react";

type BotRow = Record<string, unknown>;

const STATUS_OPTIONS = ["", "active", "paused", "expired", "cancelled"];
const PLAN_OPTIONS = ["", "Basic", "Pro", "Premium"];

export default function AdminBotsPage() {
  const [rows, setRows] = useState<BotRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [q, setQ] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [gameplayOpen, setGameplayOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ botId: string; action: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formUserId, setFormUserId] = useState("");
  const [formPlan, setFormPlan] = useState("Basic");
  const [formAmount, setFormAmount] = useState("");
  const [formDailyPct, setFormDailyPct] = useState("1");
  const [formExpiry, setFormExpiry] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (statusFilter) params.set("status", statusFilter);
    if (planFilter) params.set("plan", planFilter);
    if (q) params.set("q", q);
    const r = await fetch(`/api/admin/bots?${params}`, { credentials: "include" });
    const j = await r.json();
    if (!r.ok || j.error) { setError(j.error || "Failed to load"); setLoading(false); return; }
    setRows(j.rows || []);
    setTotal(j.total || 0);
    setLoading(false);
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

  function handleBotAction(botId: string, action: string) {
    setConfirmAction({ botId, action });
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

  const statusColors: Record<string, string> = { active: "bg-emerald-500/20 text-emerald-400", paused: "bg-yellow-500/20 text-yellow-400", expired: "bg-slate-500/20 text-slate-300", cancelled: "bg-red-500/20 text-red-400" };

  const columns = [
    { key: "name", label: "User", render: (r: BotRow) => <span className="font-medium text-white">{String(r.name ?? "-")}</span> },
    { key: "plan", label: "Plan", render: (r: BotRow) => <span className="text-yellow-400">{String(r.plan ?? "-")}</span> },
    { key: "amount", label: "Amount", render: (r: BotRow) => <span className="text-white">${Number(r.amount ?? 0).toLocaleString()}</span> },
    { key: "daily_pct", label: "Daily %", render: (r: BotRow) => <span className="text-emerald-400">{Number(r.daily_pct ?? 0)}%</span> },
    { key: "start_date", label: "Start Date", render: (r: BotRow) => <span className="text-xs text-slate-300">{String(r.start_date ?? "-")?.slice(0, 10)}</span> },
    { key: "expiry_date", label: "Expiry", render: (r: BotRow) => <span className="text-xs text-slate-300">{String(r.expiry_date ?? "-")?.slice(0, 10) || "-"}</span> },
    { key: "total_earned", label: "Total Earned", render: (r: BotRow) => <span className="text-emerald-400">${Number(r.total_earned ?? 0).toLocaleString()}</span> },
    { key: "last_roi_at", label: "Last ROI", render: (r: BotRow) => <span className="text-xs text-slate-400">{String(r.last_roi_at ?? "-")?.slice(0, 10) || "-"}</span> },
    { key: "status", label: "Status", render: (r: BotRow) => <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${statusColors[String(r.status)] || "bg-white/10 text-slate-300"}`}>{String(r.status ?? "-")}</span> },
    { key: "actions", label: "Actions", render: (r: BotRow) => {
      const s = String(r.status);
      const canPause = s === "active";
      const canResume = s === "paused";
      const canCancel = s === "active" || s === "paused";
      return (
        <div className="flex gap-1">
          {canPause && <button onClick={() => handleBotAction(String(r.id), "pause")} className="rounded-lg bg-yellow-500/20 p-1.5 text-yellow-400 hover:bg-yellow-500/30" title="Pause"><Pause className="h-3.5 w-3.5" /></button>}
          {canResume && <button onClick={() => handleBotAction(String(r.id), "resume")} className="rounded-lg bg-emerald-500/20 p-1.5 text-emerald-400 hover:bg-emerald-500/30" title="Resume"><Play className="h-3.5 w-3.5" /></button>}
          {canCancel && <button onClick={() => handleBotAction(String(r.id), "cancel")} className="rounded-lg bg-red-500/20 p-1.5 text-red-400 hover:bg-red-500/30" title="Cancel"><Square className="h-3.5 w-3.5" /></button>}
          <button onClick={() => setGameplayOpen(true)} className="rounded-lg bg-blue-500/20 p-1.5 text-blue-400 hover:bg-blue-500/30" title="View Gameplay"><Eye className="h-3.5 w-3.5" /></button>
        </div>
      );
    } },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black">Bots</h2>
          <p className="text-sm text-slate-400">Manage trading bots</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="av-btn-yellow flex items-center gap-2 rounded-lg px-4 py-2 text-sm"><Plus className="h-4 w-4" />Create Bot</button>
      </div>

      <div className="av-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search user, email, referral..." className="av-input pl-9" />
          </div>
          <div className="relative">
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="av-input pr-8">
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : "All Status"}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }} className="av-input pr-8">
              {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{p || "All Plans"}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="av-card">
        <DataTable columns={columns} data={rows} page={page} limit={limit} total={total} onPageChange={setPage} onLimitChange={(l: number) => { setLimit(l); setPage(1); }} rowKey={(r: BotRow) => String(r.id)} />
      </div>

      {createOpen && (
        <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create Bot">
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">User ID / Referral Code</label>
              <input value={formUserId} onChange={(e) => setFormUserId(e.target.value)} placeholder="User ID or referral code" className="av-input" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Plan</label>
              <select value={formPlan} onChange={(e) => setFormPlan(e.target.value)} className="av-input">
                {["Basic", "Pro", "Premium"].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Amount ($)</label>
                <input type="number" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} placeholder="0.00" className="av-input" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Daily %</label>
                <input type="number" value={formDailyPct} onChange={(e) => setFormDailyPct(e.target.value)} placeholder="1" className="av-input" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Expiry Date</label>
              <input type="date" value={formExpiry} onChange={(e) => setFormExpiry(e.target.value)} className="av-input" />
            </div>
            <button onClick={submitCreate} disabled={submitting || !formUserId || !formAmount} className="av-btn-yellow w-full rounded-lg py-2.5 text-sm disabled:opacity-50">{submitting ? "Creating..." : "Create Bot"}</button>
          </div>
        </Modal>
      )}

      {gameplayOpen && (
        <Modal isOpen={gameplayOpen} onClose={() => setGameplayOpen(false)} title="Gameplay History">
          <div className="space-y-3">
            <p className="text-sm text-slate-300">Gameplay history is available for each bot instance. Detailed session logs are recorded per ROI cycle.</p>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center text-sm text-slate-400">Gameplay history available</div>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={confirmBotAction}
        title={`${confirmAction?.action === "cancel" ? "Cancel" : confirmAction?.action === "pause" ? "Pause" : "Resume"} Bot`}
        message={`Are you sure you want to ${confirmAction?.action} this bot?`}
        confirmText={confirmAction ? (confirmAction.action.charAt(0).toUpperCase() + confirmAction.action.slice(1)) : "Confirm"}
        destructive={confirmAction?.action === "cancel"}
      />
    </div>
  );
}
