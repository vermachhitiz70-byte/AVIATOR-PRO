import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
const env = Object.fromEntries(
  readFileSync("C:\\Users\\kjass\\AppData\\Local\\Temp\\opencode\\.env.prod", "utf8")
    .split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); let v = l.slice(i + 1); if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1); return [l.slice(0, i), v]; })
);
const t0 = Date.now();
const db = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
try {
  const r = await db.execute("SELECT COUNT(*) as c FROM users");
  console.log(`DIRECT-TURSO ok in ${Date.now() - t0}ms`, JSON.stringify(r.rows));
} catch (e) {
  console.log(`DIRECT-TURSO FAIL in ${Date.now() - t0}ms:`, String(e).slice(0, 300));
}
db.close();
