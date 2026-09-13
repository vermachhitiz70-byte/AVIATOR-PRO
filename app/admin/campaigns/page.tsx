"use client";
import { useEffect, useState, useCallback } from "react";
import { DataTable, Modal, ConfirmDialog } from "@/components/admin";
import { BTN_PRIMARY, CARD, INPUT, LABEL, fmtUSD, pill } from "@/components/admin/ui";
import { Search, Plus, Edit3, Trash2, UserPlus } from "lucide-react";

type Campaign = Record<string, unknown>;
type Achiever = Record<string, unknown>;

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [achievers, setAchievers] = useState<Achiever[]>([]);
  const [error, setError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [achieverModalOpen, setAchieverModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formName, setFormName] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formMeetingDate, setFormMeetingDate] = useState("");
  const [formEligibilityEnd, setFormEligibilityEnd] = useState("");
  const [formStatus, setFormStatus] = useState("active");
  const [formCriteria, setFormCriteria] = useState("{}");

  const [achieverFilter, setAchieverFilter] = useState("");
  const [bulkAchieverText, setBulkAchieverText] = useState("");

  const fetchData = useCallback(async () => {
    setError("");
    const r = await fetch("/api/admin/campaigns", { credentials: "include" });
    const j = await r.json();
    if (!r.ok || j.error) { setError(j.error || "Failed to load"); return; }
    setCampaigns(j.campaigns || []);
    setAchievers(j.achievers || []);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openCreate() {
    setEditCampaign(null);
    setFormName(""); setFormLocation(""); setFormMeetingDate(""); setFormEligibilityEnd(""); setFormStatus("active"); setFormCriteria("{}");
    setCreateOpen(true);
  }
  function openEdit(c: Campaign) {
    setEditCampaign(c);
    setFormName(String(c.name || "")); setFormLocation(String(c.location || "")); setFormMeetingDate(String(c.meeting_date || "")); setFormEligibilityEnd(String(c.eligibility_end || ""));
    setFormStatus(String(c.status || "active")); setFormCriteria(typeof c.criteria_json === "string" ? c.criteria_json : JSON.stringify(c.criteria_json || {}));
    setCreateOpen(true);
  }

  async function submitCampaign() {
    setSubmitting(true);
    const body = editCampaign
      ? { action: "update", id: editCampaign.id, name: formName, location: formLocation, meeting_date: formMeetingDate, eligibility_end: formEligibilityEnd, status: formStatus, criteria: formCriteria }
      : { action: "create", name: formName, location: formLocation, meeting_date: formMeetingDate, eligibility_end: formEligibilityEnd, status: formStatus, criteria: formCriteria };
    const r = await fetch("/api/admin/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), credentials: "include" });
    const j = await r.json();
    setSubmitting(false);
    if (!r.ok || j.error) { alert(j.error || "Action failed"); return; }
    setCreateOpen(false);
    fetchData();
  }
  async function deleteCampaign(id: string) {
    setSubmitting(true);
    const r = await fetch("/api/admin/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }), credentials: "include" });
    const j = await r.json();
    setSubmitting(false);
    if (!r.ok || j.error) { alert(j.error || "Failed"); return; }
    setConfirmDelete(null);
    fetchData();
  }
  async function bulkAddAchievers() {
    setSubmitting(true);
    const ids = bulkAchieverText.split(",").map((s) => s.trim()).filter(Boolean);
    const r = await fetch("/api/admin/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "addAchievers", campaign_id: achieverFilter, user_ids: ids }), credentials: "include" });
    const j = await r.json();
    setSubmitting(false);
    if (!r.ok || j.error) { alert(j.error || "Failed"); return; }
    setAchieverModalOpen(false);
    setBulkAchieverText("");
    fetchData();
  }

  const filteredAchievers = achieverFilter ? achievers.filter((a) => String(a.campaign_id) === achieverFilter) : achievers;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold text-gray-900">Campaigns</h1>
        <p className="mt-1 text-sm text-gray-500">Reward tours and achiever leaderboards</p>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p>}

      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-900">All Campaigns</h2>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-[#e8821e] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#d1710f]"><Plus className="h-4 w-4" />New Campaign</button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {campaigns.map((c) => (
          <div key={String(c.id)} className={`${CARD} p-5`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate font-bold text-gray-900">{String(c.name)}</h3>
                <p className="text-xs text-gray-500">{String(c.location || "-")}</p>
              </div>
              {pill(c.status)}
            </div>
            <div className="mt-3 space-y-1 text-xs text-gray-500">
              <p>Meeting: <span className="font-semibold text-gray-700">{String(c.meeting_date || "-").slice(0, 10)}</span></p>
              <p>Eligibility ends: <span className="font-semibold text-gray-700">{String(c.eligibility_end || "-").slice(0, 10)}</span></p>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => openEdit(c)} className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-[#e9dfc9] px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-[#faf6ee]"><Edit3 className="h-3 w-3" />Edit</button>
              <button onClick={() => setConfirmDelete(String(c.id))} className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"><Trash2 className="h-3 w-3" />Delete</button>
            </div>
          </div>
        ))}
        {campaigns.length === 0 && <p className={`${CARD} col-span-full p-8 text-center text-sm text-gray-400`}>No campaigns yet. Create your first reward campaign.</p>}
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-gray-900">Achievers Leaderboard</h2>
          <button onClick={() => setAchieverModalOpen(true)} className="flex items-center gap-2 rounded-xl border border-[#e9dfc9] bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-[#faf6ee]"><UserPlus className="h-3.5 w-3.5" />Add Achievers</button>
        </div>
        <div className={CARD}>
          <div className="border-b border-[#f0e6d2] px-4 py-3">
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input value={achieverFilter} onChange={(e) => setAchieverFilter(e.target.value)} placeholder="Filter by campaign ID..." className={`${INPUT} pl-9`} />
            </div>
          </div>
          <DataTable
            columns={[
              { key: "name", label: "Achiever", render: (r: Achiever) => <span className="font-semibold text-gray-900">{String(r.name ?? "-")}</span> },
              { key: "country", label: "Country", render: (r: Achiever) => <span className="text-gray-600">{String(r.country ?? "-")}</span> },
              { key: "user_code", label: "User Code", render: (r: Achiever) => <span className="font-mono text-xs font-semibold text-[#e8821e]">{String(r.user_code ?? "-")}</span> },
              { key: "earned", label: "Business", render: (r: Achiever) => <span className="font-bold text-green-700">{fmtUSD(r.earned)}</span> },
              { key: "is_demo", label: "Demo", render: (r: Achiever) => pill(r.is_demo ? "pending" : "active") },
              { key: "actions", label: "Actions", render: (r: Achiever) => (
                <button onClick={async () => { await fetch("/api/admin/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "deleteAchiever", id: r.id }), credentials: "include" }); fetchData(); }} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
              ) },
            ]}
            data={filteredAchievers} page={1} limit={100} total={filteredAchievers.length}
            onPageChange={() => {}} onLimitChange={() => {}} rowKey={(r: Achiever) => String(r.id)} />
        </div>
      </div>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title={editCampaign ? "Edit Campaign" : "New Campaign"}>
        <div className="space-y-4">
          <div><label className={LABEL}>Campaign name</label><input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Vietnam Ticket Achievers" className={INPUT} /></div>
          <div><label className={LABEL}>Location</label><input value={formLocation} onChange={(e) => setFormLocation(e.target.value)} placeholder="e.g. Vietnam" className={INPUT} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={LABEL}>Meeting date</label><input type="date" value={formMeetingDate} onChange={(e) => setFormMeetingDate(e.target.value)} className={INPUT} /></div>
            <div><label className={LABEL}>Eligibility end</label><input type="date" value={formEligibilityEnd} onChange={(e) => setFormEligibilityEnd(e.target.value)} className={INPUT} /></div>
          </div>
          <div><label className={LABEL}>Status</label>
            <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)} className={INPUT}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
          <div><label className={LABEL}>Eligibility criteria (JSON)</label>
            <textarea value={formCriteria} onChange={(e) => setFormCriteria(e.target.value)} className={`${INPUT} font-mono text-xs`} rows={3} /></div>
          <button onClick={submitCampaign} disabled={submitting} className={`${BTN_PRIMARY} w-full`}>{submitting ? "Saving..." : editCampaign ? "Update Campaign" : "Create Campaign"}</button>
        </div>
      </Modal>

      <Modal isOpen={achieverModalOpen} onClose={() => setAchieverModalOpen(false)} title="Add Achievers">
        <div className="space-y-4">
          <div><label className={LABEL}>Campaign ID</label><input value={achieverFilter} onChange={(e) => setAchieverFilter(e.target.value)} placeholder="Paste campaign ID" className={INPUT} /></div>
          <div><label className={LABEL}>User IDs (comma separated)</label>
            <textarea value={bulkAchieverText} onChange={(e) => setBulkAchieverText(e.target.value)} placeholder="u_abc123, u_def456, ..." className={INPUT} rows={3} /></div>
          <button onClick={bulkAddAchievers} disabled={submitting} className={`${BTN_PRIMARY} w-full`}>{submitting ? "Adding..." : "Add Achievers"}</button>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={() => confirmDelete && deleteCampaign(confirmDelete)}
        title="Delete Campaign" message="This will also remove all achievers in this campaign." confirmText="Delete" destructive />
    </div>
  );
}
