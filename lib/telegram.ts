import { getSettings } from "./db";

// Live proof channel: deposit/withdraw REQUESTS go to Telegram (masked).
// Fire-and-forget — a Telegram failure must NEVER block money flows.
export function maskEmail(email: string): string {
  const [user, domain = ""] = String(email || "").split("@");
  if (!user) return "***";
  const head = user.slice(0, 1);
  return `${head}***@${domain}`;
}

export function maskWallet(addr: string): string {
  const a = String(addr || "");
  if (a.length <= 12) return a || "—";
  return `${a.slice(0, 6)}...${a.slice(-4)}`;
}

export function istNow(): string {
  const d = new Date(Date.now() + 330 * 60000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

async function postText(token: string, chatId: string, text: string): Promise<boolean> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!r.ok) return false;
    const j = (await r.json().catch(() => null)) as { ok?: boolean } | null;
    return !!j?.ok;
  } catch {
    clearTimeout(t);
    return false;
  }
}

export async function telegramConfig(): Promise<{ enabled: boolean; token: string; chatId: string }> {
  try {
    const s = await getSettings();
    const flag = String(s.telegramEnabled || "off").toLowerCase();
    return {
      enabled: flag === "on" || flag === "true" || flag === "1",
      token: String(s.telegramBotToken || ""),
      chatId: String(s.telegramChatId || ""),
    };
  } catch {
    return { enabled: false, token: "", chatId: "" };
  }
}

// Sends proof text if enabled + configured. Never throws.
export async function sendProof(text: string): Promise<boolean> {
  try {
    const c = await telegramConfig();
    if (!c.enabled || !c.token || !c.chatId) return false;
    return await postText(c.token, c.chatId, text);
  } catch {
    return false;
  }
}

export function depositProof(o: { name: string; code: string; email: string; amount: number; tx: string }): string {
  return [
    "Aviator Deposit Request",
    `User: ${o.name} (${o.code})`,
    `Email: ${maskEmail(o.email)}`,
    `Amount: $${Number(o.amount).toFixed(2)}`,
    `TX: ${maskWallet(o.tx)}`,
    "Network: BEP20",
    `Time: ${istNow()}`,
  ].join("\n");
}

export function withdrawProof(o: { name: string; code: string; email: string; amount: number; net: number; wallet: string }): string {
  return [
    "Aviator Withdrawal Request",
    `User: ${o.name} (${o.code})`,
    `Email: ${maskEmail(o.email)}`,
    `Requested: $${Number(o.amount).toFixed(2)}`,
    `Payable: $${Number(o.net).toFixed(2)}`,
    `Wallet: ${maskWallet(o.wallet)}`,
    `Time: ${istNow()}`,
  ].join("\n");
}
