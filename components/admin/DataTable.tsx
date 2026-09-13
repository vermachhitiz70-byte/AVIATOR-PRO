"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZES = [10, 25, 50, 100];

export function DataTable<T>({ columns, data, page, limit, total, onPageChange, onLimitChange, rowKey, selectedIds, onToggleSelect, onToggleAll }: { columns: { key: string; label: string; render?: (row: T) => React.ReactNode }[]; data: T[]; page: number; limit: number; total: number; onPageChange: (p: number) => void; onLimitChange: (l: number) => void; rowKey: (row: T) => string; selectedIds?: Set<string>; onToggleSelect?: (id: string) => void; onToggleAll?: () => void }) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  const allSelected = data.length > 0 && data.every((row) => selectedIds?.has(rowKey(row)));
  const someSelected = data.some((row) => selectedIds?.has(rowKey(row))) && !allSelected;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-slate-400">
            {onToggleSelect && <th className="px-4 py-3 w-10"><input type="checkbox" checked={allSelected} ref={(el) => { if (el) el.indeterminate = someSelected; }} onChange={onToggleAll} className="h-4 w-4 rounded border-white/20 bg-white/5" /></th>}
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 font-medium">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={rowKey(row)} className={`border-b border-white/5 hover:bg-white/5 ${selectedIds?.has(rowKey(row)) ? "bg-yellow-500/5" : ""}`}>
              {onToggleSelect && <td className="px-4 py-3"><input type="checkbox" checked={selectedIds?.has(rowKey(row))} onChange={() => onToggleSelect(rowKey(row))} className="h-4 w-4 rounded border-white/20 bg-white/5" /></td>}
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3">
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length + (onToggleSelect ? 1 : 0)} className="px-4 py-8 text-center text-slate-400">No data found</td>
            </tr>
          )}
        </tbody>
      </table>
      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Show</span>
            <select value={limit} onChange={(e) => onLimitChange(Number(e.target.value))} className="rounded border border-white/10 bg-white/5 px-2 py-1">
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <span>of {total} entries</span>
          </div>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="rounded-lg border border-white/10 p-1.5 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
            <span className="px-3 text-xs text-slate-300">Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="rounded-lg border border-white/10 p-1.5 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
