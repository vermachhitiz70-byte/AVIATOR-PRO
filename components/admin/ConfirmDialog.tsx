"use client";
import { useEffect, useState } from "react";

export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel", destructive = false, requireConsent = false, consentText = "I consent to do this and all consequences that follow." }: { isOpen: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; confirmText?: string; cancelText?: string; destructive?: boolean; requireConsent?: boolean; consentText?: string }) {
  const [agreed, setAgreed] = useState(false);
  useEffect(() => { if (isOpen) setAgreed(false); }, [isOpen]);
  if (!isOpen) return null;
  const blocked = requireConsent && !agreed;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border-2 border-amber-300 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="rounded-t-2xl bg-amber-50 px-5 py-4">
          <h3 className="text-base font-black text-gray-900">⚠ {title}</h3>
          <p className="mt-2 text-sm font-medium text-gray-700">{message}</p>
        </div>
        <div className="px-5 py-4">
          {requireConsent && (
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-[#f0e6d2] bg-[#faf6ec] px-3 py-2.5 text-sm font-semibold text-gray-800 hover:bg-[#f5eddc]">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#e8821e]" />
              {consentText}
            </label>
          )}
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={onClose} className="rounded-xl border border-[#e9dfc9] px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">No, go back</button>
            <button
              onClick={() => { if (blocked) return; onConfirm(); onClose(); }}
              disabled={blocked}
              title={blocked ? "Tick the checkbox first" : undefined}
              className={`rounded-xl px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40 ${destructive ? "bg-red-500 hover:bg-red-600" : "bg-[#e8821e] hover:bg-[#d1710f]"}`}>
              Yes{confirmText === "Confirm" ? "" : `, ${confirmText}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
