"use client";
import { X } from "lucide-react";

export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel", destructive = false }: { isOpen: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; confirmText?: string; cancelText?: string; destructive?: boolean }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#111827] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <p className="mt-2 text-sm text-slate-300">{message}</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-white/10 px-5 py-4">
          <button onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium hover:bg-white/5">{cancelText}</button>
          <button onClick={() => { onConfirm(); onClose(); }} className={`rounded-lg px-4 py-2 text-sm font-bold ${destructive ? "bg-red-500 hover:bg-red-600" : "av-btn-yellow"}`}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}
