import { redirect } from "next/navigation";
import { DashBackButton, DashBottom, DashSidebar, DashTop, DashTopBar } from "@/components/dash";
import { currentUser } from "@/lib/auth";
import { getDb, initDb, withTimeout } from "@/lib/db";

// Hard activation gate: no confirmed deposit (or active bot) => /activate.
// Admins bypass. Pending deposits do NOT unlock the dashboard.
// DB calls are time-bounded so a stalled connection fails fast (build
// prerender + runtime) instead of hanging the render past 60s.
export default async function DashLayout({ children }: { children: React.ReactNode }) {
  await withTimeout(initDb());
  const u = await currentUser();
  if (!u) redirect("/login");
  if ((u as unknown as { is_blocked: number }).is_blocked) redirect("/login");
  const isAdmin = !!(u as unknown as { is_admin: number }).is_admin;
  if (!isAdmin) {
    const db = getDb();
    const uid = u.id as string;
    const conf = await withTimeout(db.execute({ sql: "SELECT id FROM deposits WHERE user_id=? AND status='confirmed' LIMIT 1", args: [uid] }));
    if (!conf.rows.length) {
      const bot = await withTimeout(db.execute({ sql: "SELECT id FROM bots WHERE user_id=? AND status='active' LIMIT 1", args: [uid] }));
      if (!bot.rows.length) redirect("/activate");
    }
  }
  return (
    <div className="min-h-screen bg-[#060b16] text-white">
      <DashSidebar />
      <div className="lg:pl-64">
        <div className="lg:hidden">
          <DashTop />
        </div>
        <DashTopBar />
        <main className="mx-auto w-full max-w-md px-3 pb-28 pt-3 lg:max-w-6xl lg:px-8 lg:py-6">
          <DashBackButton />
          {children}
        </main>
        <div className="lg:hidden">
          <DashBottom />
        </div>
      </div>
    </div>
  );
}
