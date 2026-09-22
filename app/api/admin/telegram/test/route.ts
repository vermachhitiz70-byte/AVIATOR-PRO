import { NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { getSettings } from "@/lib/db";

// POST /api/admin/telegram/test — sends a test message using saved settings.
export async function POST() {
  await initDb();
  const { error } = await requireAdmin();
  if (error) return error;
  const s = await getSettings();
  const token = String(s.telegramBotToken || "");
  const chatId = String(s.telegramChatId || "");
  if (!token || !chatId)
    return NextResponse.json({ ok: false, error: "Bot token and chat ID required (paste in Settings, then Save All)" }, { status: 400 });
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: "Aviator Smart AI proofs connected. Deposit + withdrawal requests will appear here live." }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    const j = (await r.json().catch(() => null)) as { ok?: boolean; description?: string } | null;
    if (!r.ok || !j?.ok)
      return NextResponse.json({ ok: false, error: String(j?.description || "Telegram rejected the message (check token, chat ID, bot admin)") }, { status: 400 });
    return NextResponse.json({ ok: true, sent: true });
  } catch {
    clearTimeout(t);
    return NextResponse.json({ ok: false, error: "Could not reach Telegram. Retry." }, { status: 503 });
  }
}
