"use client";
import { X } from "lucide-react";

export function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4" onClick={onClose}>
      <div className="mx-auto my-4 flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#f0e6d2] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-[#f5eddc] px-5 py-4">
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-lg border border-[#f0e6d2] p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800"><X className="h-5 w-5" /></button>
        </div>
        <div className="modal-scroll overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
