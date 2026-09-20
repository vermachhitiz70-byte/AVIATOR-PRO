"use client";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { DEPOSIT_ADDRESS } from "@/lib/config";

export default function Recharge() {
  const [amount, setAmount] = useState("200");
  const [tx, setTx] = useState("");
  const [msg, setMsg] = useState("");
  const [rows, setRows] = useState<{ created_at?: string; request_id?: string; requested?: number; actual?: number; status?: string }[]>([]);
  const [addr, setAddr] = useState(DEPOSIT_ADDRESS);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [qrError, setQrError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/recharge").then((r) => r.json()).then((j) => {
      if (j.ok) {
        setRows(j.rows);
        const a = String(j.address || "").trim();
        if (a && !a.includes("YOUR")) setAddr(a);
      }
    }).catch(() => {});
  }, []);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f) {
      const reader = new FileReader();
      reader.onload = () => setPreview(String(reader.result));
      reader.readAsDataURL(f);
    } else setPreview("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setMsg("Please upload payment screenshot"); return; }
    setBusy(true);
    setMsg("Uploading...");
    try {
      // convert screenshot to base64 data URL (stored directly; for production use Vercel Blob)
      const screenshot_url = preview;
      const r = await fetch("/api/recharge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: Number(amount), tx_hash: tx, screenshot_url }) });
      const j = await r.json();
      setMsg(j.ok ? `Submitted ${j.request_id} – pending approval. Dashboard unlocks once approved.` : j.error);
      if (j.ok) { setTx(""); setFile(null); setPreview(""); const r2 = await fetch("/api/recharge").then((x) => x.json()); if (r2.ok) setRows(r2.rows); }
    } catch {
      setMsg("Upload failed, try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="av-card p-4">
        <h2 className="font-black">Activate Plan — BEP20 Payment</h2>
        <p className="mt-1 text-xs text-slate-400">Choose any tier (Starter $10 – Diamond $100K). Scan QR or copy address, send USDT-BEP20, then submit proof. Admin verifies → dashboard unlocks.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr]">
          <div className="flex flex-col items-center rounded-xl bg-white p-4">
            {!qrError ? (
              <img src="/wallet-qr.jpeg" alt="Wallet QR" className="h-[180px] w-[180px] object-contain" onError={() => setQrError(true)} />
            ) : (
              <QRCodeSVG value={addr} size={180} />
            )}
            <p className="mt-2 text-center text-[11px] text-slate-600">Scan to pay USDT-BEP20</p>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-300">Deposit address (BEP20)</p>
            <div className="mt-1 flex gap-2">
              <p className="flex-1 break-all rounded-lg bg-black/40 px-3 py-2 text-xs font-mono text-yellow-300">{addr}</p>
              <button onClick={() => { if (addr) navigator.clipboard.writeText(addr); }} className="rounded-lg border border-white/20 px-3 py-2 text-xs">Copy</button>
            </div>
            <p className="mt-2 text-xs text-slate-400">Network: BEP20 (BSC) · Currency: USDT · Min $10</p>
          </div>
        </div>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <input className="av-input" placeholder="Amount USD / USDT (min 10)" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          <input className="av-input" placeholder="TX hash (e.g. 0x...)" value={tx} onChange={(e) => setTx(e.target.value)} required />
          <div>
            <p className="mb-1 text-xs font-bold text-slate-300">Payment screenshot *</p>
            <input type="file" accept="image/*" onChange={onFile} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300" required />
            {preview && <img src={preview} alt="preview" className="mt-2 max-h-40 rounded-lg border border-white/10" />}
          </div>
          <button disabled={busy} className="av-btn-yellow w-full py-3 disabled:opacity-60">{busy ? "Submitting..." : "Submit for Admin Approval"}</button>
        </form>
        {msg && <p className="mt-2 text-sm text-yellow-200">{msg}</p>}
      </div>
      <div className="av-card p-4">
        <h3 className="font-bold">⛉ Your Recharge Verification</h3>
        <p className="text-xs text-slate-400">Admin approval required before dashboard unlocks. 5-level commission on first recharge.</p>
        <table className="av-table mt-2"><thead><tr><th>Date</th><th>Request</th><th>Requested</th><th>Actual</th><th>Status</th></tr></thead><tbody>{rows.map((r, i) => (<tr key={i}><td>{String(r.created_at || "").slice(0, 16).replace("T", " ")}</td><td className="break-all text-xs">{r.request_id}</td><td>{Number(r.requested).toFixed(2)}</td><td>{Number(r.actual).toFixed(2)}</td><td>{r.status}</td></tr>))}{rows.length===0 && <tr><td colSpan={5} className="py-4 text-center text-xs text-slate-500">No recharges yet. Submit proof above.</td></tr>}</tbody></table>
      </div>
    </div>
  );
}
