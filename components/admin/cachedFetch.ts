"use client";

// Shared GET cache for admin shell data (sidebar + topbar + page all need
// /api/admin/overview — without this every admin page fires it 3 times).
// Module-level: one request per URL per TTL across all mounted components.
const cache = new Map<string, { t: number; p: Promise<unknown> }>();

export function cachedGet<T>(url: string, ttlMs = 30000): Promise<T> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.t < ttlMs) return hit.p as Promise<T>;
  const p = fetch(url, { credentials: "include" })
    .then((r) => r.json())
    .catch(() => null);
  cache.set(url, { t: Date.now(), p });
  return p as Promise<T>;
}
