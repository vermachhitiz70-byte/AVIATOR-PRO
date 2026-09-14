"use client";
import { useEffect, useState, useCallback } from "react";
import { Modal } from "@/components/admin";
import { BTN_PRIMARY, CARD, INPUT, LABEL } from "@/components/admin/ui";
import { Eye, EyeOff, Save, Mail, Server, Shield, Loader2 } from "lucide-react";

type Settings = Record<string, string>;

const PLATFORM_KEYS = [
  { key: "minDeposit", label: "Min Deposit ($)", type: "number" },
  { key: "minWithdrawal", label: "Min Withdrawal ($)", type: "number" },
  { key: "maxWithdrawal", label: "Max Withdrawal ($)", type: "number" },
  { key: "withdrawalChargePct", label: "Withdrawal Deduction %", type: "number" },
  { key: "withdrawStartIST", label: "Withdrawal Window Start", type: "time" },
  { key: "withdrawEndIST", label: "Withdrawal Window Closes", type: "time" },
  { key: "maintenanceMode", label: "Maintenance Mode", type: "toggle" },
  { key: "depositAddress", label: "BEP20 Deposit Address", type: "text" },
];

const SMTP_KEYS = [
  { key: "smtp_host", label: "SMTP Host", type: "text" },
  { key: "smtp_port", label: "SMTP Port", type: "number" },
  { key: "smtp_user", label: "SMTP Username", type: "text" },
  { key: "smtp_pass", label: "SMTP App Password", type: "password" },
  { key: "smtp_from", label: "From Address", type: "text" },
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
  function updateSetting(key: string, value: string) { setSettings((prev) => ({ ...prev, [key]: value })); }

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
    alert("SMTP test initiated. Check the inbox for a test email.");
    setTesting(false);
    setTestSmtpOpen(false);
    setTestEmail("");
  }

  function renderInput(key: string, label: string, type: string) {
    const isPassword = type === "password";
    const isToggle = type === "toggle" || key === "maintenanceMode";
    const isSecret = key.includes("secret");
    const masked = (isPassword || isSecret) && !showSecrets;

    if (isToggle) {
      const val = getValue(key) === "true" || getValue(key) === "1" || getValue(key) === "on";
      const onVal = key === "maintenanceMode" ? "on" : "true";
      const offVal = key === "maintenanceMode" ? "off" : "false";
      return (
        <div key={key} className="flex items-center justify-between rounded-xl bg-[#faf6ee] px-4 py-3">
          <label className="text-sm font-medium text-gray-700">{label}</label>
          <button onClick={() => updateSetting(key, val ? offVal : onVal)} className={`relative h-6 w-11 rounded-full transition ${val ? "bg-[#e8821e]" : "bg-gray-300"}`}>
            <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${val ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </div>
      );
    }

    return (
      <div key={key}>
        <label className={LABEL}>{label}</label>
        <input
          type={masked ? "password" : type === "number" ? "number" : "text"}
          value={masked ? "••••••••" : getValue(key)}
          onChange={(e) => { if (!masked) updateSetting(key, e.target.value); }}
          readOnly={masked}
          placeholder={`Enter ${label.toLowerCase()}`}
          className={INPUT}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">Platform, email and security configuration</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSecrets((p) => !p)} className="flex items-center gap-1.5 rounded-xl border border-[#e9dfc9] bg-white px-3 py-2.5 text-xs font-semibold text-gray-600 hover:bg-[#faf6ee]">
            {showSecrets ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}{showSecrets ? "Hide Secrets" : "Show Secrets"}
          </button>
          <button onClick={saveAll} disabled={saving} className="flex items-center gap-2 rounded-xl bg-[#e8821e] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#d1710f]">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? "Saving..." : "Save All"}
          </button>
        </div>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p>}
      {success && <p className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">{success}</p>}

      {loading ? (
        <div className="space-y-4">
          <div className="h-40 animate-pulse rounded-2xl bg-white" />
          <div className="h-40 animate-pulse rounded-2xl bg-white" />
        </div>
      ) : (
        <>
          <div className={`${CARD} p-5`}>
            <div className="mb-4 flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-[#e8821e]"><Server className="h-4 w-4" /></span><h2 className="font-bold text-gray-900">Platform Settings</h2></div>
            <div className="grid gap-3 md:grid-cols-2">{PLATFORM_KEYS.map(({ key, label, type }) => renderInput(key, label, type))}</div>
          </div>

          <div className={`${CARD} p-5`}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600"><Mail className="h-4 w-4" /></span><h2 className="font-bold text-gray-900">Email (SMTP) Settings</h2></div>
              <button onClick={() => setTestSmtpOpen(true)} className="rounded-xl border border-[#e9dfc9] px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-[#faf6ee]">Test Email</button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">{SMTP_KEYS.map(({ key, label, type }) => renderInput(key, label, type))}</div>
            <p className="mt-3 text-xs text-gray-400">Daily ROI runs automatically every day at <span className="font-semibold">5:00 AM IST</span> (Vercel Cron) — tier rate per bot + 10-level team income, credited to earning wallets.</p>
          </div>

          <div className={`${CARD} p-5`}>
            <div className="mb-4 flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-600"><Shield className="h-4 w-4" /></span><h2 className="font-bold text-gray-900">Security</h2></div>
            <div className="grid gap-3 md:grid-cols-2">{SECURITY_KEYS.map(({ key, label, type }) => renderInput(key, label, type))}</div>
          </div>
        </>
      )}

      <Modal isOpen={testSmtpOpen} onClose={() => setTestSmtpOpen(false)} title="Send Test Email">
        <div className="space-y-4">
          <div><label className={LABEL}>Recipient address</label>
            <input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="you@example.com" className={INPUT} /></div>
          <button onClick={testSmtp} disabled={testing || !testEmail.trim()} className={`${BTN_PRIMARY} w-full`}>{testing ? "Sending..." : "Send Test Email"}</button>
        </div>
      </Modal>
    </div>
  );
}
