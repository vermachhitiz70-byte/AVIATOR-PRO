"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZES = [10, 25, 50, 100];

export function DataTable<T>({ columns, data, page, limit, total, onPageChange, onLimitChange, rowKey, selectedIds, onToggleSelect, onToggleAll }: { columns: { key: string; label: string; render?: (row: T) => React.ReactNode }[]; data: T[]; page: number; limit: number; total: number; onPageChange: (p: number) => void; onLimitChange: (l: number) => void; rowKey: (row: T) => string; selectedIds?: Set<string>; onToggleSelect?: (id: string) => void; onToggleAll?: () => void }) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const allSelected = data.length > 0 && data.every((row) => selectedIds?.has(rowKey(row)));
  const someSelected = data.some((row) => selectedIds?.has(rowKey(row))) && !allSelected;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[#f0e6d2] text-xs uppercase tracking-wide text-gray-400">
            {onToggleSelect && <th className="w-10 px-4 py-3"><input type="checkbox" checked={allSelected} ref={(el) => { if (el) el.indeterminate = someSelected; }} onChange={onToggleAll} className="h-4 w-4 rounded accent-[#e8821e]" /></th>}
            {columns.map((col) => (
              <th key={col.key} className="whitespace-nowrap px-4 py-3 font-semibold">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={rowKey(row)} className={`border-b border-[#f8f2e4] last:border-0 hover:bg-orange-50/50 ${selectedIds?.has(rowKey(row)) ? "bg-orange-50" : ""}`}>
              {onToggleSelect && <td className="px-4 py-3"><input type="checkbox" checked={selectedIds?.has(rowKey(row))} onChange={() => onToggleSelect(rowKey(row))} className="h-4 w-4 rounded accent-[#e8821e]" /></td>}
              {columns.map((col) => (
                <td key={col.key} className="whitespace-nowrap px-4 py-3 text-gray-700">
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "-")}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length + (onToggleSelect ? 1 : 0)} className="px-4 py-10 text-center text-sm text-gray-400">No records found</td>
            </tr>
          )}
        </tbody>
      </table>
      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f0e6d2] px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Show</span>
            <select value={limit} onChange={(e) => onLimitChange(Number(e.target.value))} className="rounded-lg border border-[#e9dfc9] bg-white px-2 py-1 text-gray-700">
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <span>of {total} entries</span>
          </div>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="rounded-lg border border-[#e9dfc9] bg-white p-1.5 text-gray-600 disabled:opacity-40 hover:bg-[#faf6ee]"><ChevronLeft className="h-4 w-4" /></button>
            <span className="px-3 text-xs text-gray-500">Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="rounded-lg border border-[#e9dfc9] bg-white p-1.5 text-gray-600 disabled:opacity-40 hover:bg-[#faf6ee]"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
