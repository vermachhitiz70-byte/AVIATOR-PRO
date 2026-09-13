"use client";

export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel", destructive = false }: { isOpen: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; confirmText?: string; cancelText?: string; destructive?: boolean }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-[#f0e6d2] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4">
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <p className="mt-2 text-sm text-gray-600">{message}</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#f5eddc] px-5 py-4">
          <button onClick={onClose} className="rounded-xl border border-[#e9dfc9] px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">{cancelText}</button>
          <button onClick={() => { onConfirm(); onClose(); }} className={`rounded-xl px-4 py-2 text-sm font-bold text-white ${destructive ? "bg-red-500 hover:bg-red-600" : "bg-[#e8821e] hover:bg-[#d1710f]"}`}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}
