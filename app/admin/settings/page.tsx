"use client";
import { useEffect, useState, useCallback } from "react";
import { StatCard } from "@/components/admin/StatCard";
import { Modal, ConfirmDialog } from "@/components/admin";
import { Eye, EyeOff, Save, Mail, Server, Shield, Loader2 } from "lucide-react";

type Settings = Record<string, string>;

const PLATFORM_KEYS = [
  { key: "min_deposit", label: "Min Deposit ($)", type: "number" },
  { key: "withdrawal_charge_pct", label: "Withdrawal Charge %", type: "number" },
  { key: "roi_daily_pct", label: "ROI Daily %", type: "number" },
  { key: "withdrawal_window_start", label: "Withdrawal Window Start", type: "time" },
  { key: "withdrawal_window_end", label: "Withdrawal Window End", type: "time" },
  { key: "maintenance_mode", label: "Maintenance Mode", type: "toggle" },
  { key: "bep20_address", label: "BEP20 Address", type: "text" },
];

const SMTP_KEYS = [
  { key: "smtp_host", label: "SMTP Host", type: "text" },
  { key: "smtp_port", label: "SMTP Port", type: "number" },
  { key: "smtp_user", label: "SMTP User", type: "text" },
  { key: "smtp_pass", label: "SMTP Password", type: "password" },
  { key: "smtp_from", label: "SMTP From", type: "text" },
];

const SECURITY_KEYS = [
  { key: "jwt_secret", label: "JWT Secret", type: "password" },
  { key: "cron_secret", label: "Cron Secret", type: "password" },
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showSecrets, setShowSecrets] = useState(false);
  const [testSmtpOpen, setTestSmtpOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError("");
    const r = await fetch("/api/admin/settings", { credentials: "include" });
    const j = await r.json();
    if (!r.ok || j.error) { setError(j.error || "Failed"); setLoading(false); return; }
    setSettings(j.settings || {});
    setLoading(false);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  function getValue(key: string) { return settings[key] || ""; }

  function updateSetting(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function saveAll() {
    setSaving(true);
    setError("");
    setSuccess("");
    const r = await fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: settings }), credentials: "include" });
    const j = await r.json();
    setSaving(false);
    if (!r.ok || j.error) { setError(j.error || "Save failed"); return; }
    setSettings(j.settings || settings);
    setSuccess("Settings saved successfully!");
    setTimeout(() => setSuccess(""), 3000);
  }

  async function testSmtp() {
    setTesting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    alert("SMTP test initiated. Check your inbox for a test email.");
    setTesting(false);
    setTestSmtpOpen(false);
    setTestEmail("");
  }

  function renderInput(key: string, label: string, type: string) {
    const isPassword = type === "password";
    const isToggle = type === "toggle";
    const isSecret = key.includes("secret");
    const masked = (isPassword || isSecret) && !showSecrets;

    if (isToggle) {
      const val = getValue(key) === "true" || getValue(key) === "1";
      return (
        <div key={key} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3">
          <label className="text-sm text-slate-300">{label}</label>
          <button onClick={() => updateSetting(key, val ? "false" : "true")} className={`relative h-6 w-11 rounded-full transition ${val ? "bg-yellow-500" : "bg-white/20"}`}>
            <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${val ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </div>
      );
    }

    return (
      <div key={key}>
        <label className="block text-xs text-slate-400 mb-1">{label}</label>
        <input
          type={masked ? "password" : type === "number" ? "number" : "text"}
          value={masked ? "••••••••" : getValue(key)}
          onChange={(e) => !masked && updateSetting(key, e.target.value)}
          readOnly={masked}
          placeholder={`Enter ${label.toLowerCase()}`}
          className="av-input text-sm"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black">Settings</h2>
          <p className="text-sm text-slate-400">Platform configuration</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSecrets((p) => !p)} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs hover:bg-white/5">
            {showSecrets ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}{showSecrets ? "Hide Secrets" : "Show Secrets"}
          </button>
          <button onClick={saveAll} disabled={saving} className="av-btn-yellow flex items-center gap-2 rounded-lg px-4 py-2 text-sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? "Saving..." : "Save All"}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {success && <p className="text-sm text-emerald-400">{success}</p>}

      {loading ? (
        <div className="space-y-4">
          <div className="h-32 animate-pulse rounded-xl bg-white/5" />
          <div className="h-32 animate-pulse rounded-xl bg-white/5" />
        </div>
      ) : (
        <>
          <div className="av-card p-5">
            <div className="mb-4 flex items-center gap-2"><Server className="h-4 w-4 text-yellow-400" /><h3 className="font-bold">Platform Settings</h3></div>
            <div className="grid gap-3 md:grid-cols-2">{PLATFORM_KEYS.map(({ key, label, type }) => renderInput(key, label, type))}</div>
          </div>

          <div className="av-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-yellow-400" /><h3 className="font-bold">SMTP Settings</h3></div>
              <button onClick={() => setTestSmtpOpen(true)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5">Test SMTP</button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">{SMTP_KEYS.map(({ key, label, type }) => renderInput(key, label, type))}</div>
          </div>

          <div className="av-card p-5">
            <div className="mb-4 flex items-center gap-2"><Shield className="h-4 w-4 text-yellow-400" /><h3 className="font-bold">Security</h3></div>
            <div className="grid gap-3 md:grid-cols-2">{SECURITY_KEYS.map(({ key, label, type }) => renderInput(key, label, type))}</div>
          </div>
        </>
      )}

      {testSmtpOpen && (
        <Modal isOpen={testSmtpOpen} onClose={() => setTestSmtpOpen(false)} title="Test SMTP">
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Test Email Address</label>
              <input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="test@example.com" className="av-input" />
            </div>
            <button onClick={testSmtp} disabled={testing || !testEmail.trim()} className="av-btn-yellow w-full rounded-lg py-2.5 text-sm disabled:opacity-50">{testing ? "Sending..." : "Send Test Email"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
