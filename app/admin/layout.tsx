import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { NotificationProvider } from "@/components/admin/NotificationContext";
import { redirect } from "next/navigation";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-change-me-please-long");

async function getAdminUser() {
  try {
    const cookie = (await cookies()).get("av_session")?.value;
    if (!cookie) return null;
    const { payload } = await jwtVerify(cookie, JWT_SECRET);
    const { getDb, initDb } = await import("@/lib/db");
    await initDb();
    const db = getDb();
    const r = await db.execute({
      sql: "SELECT id,name,email,referral_code,is_admin FROM users WHERE id=? AND is_admin=1",
      args: [payload.uid as string],
    });
    if (r.rows.length === 0) return null;
    return r.rows[0] as unknown as { id: string; name: string; email: string; referral_code: string; is_admin: number };
  } catch {
    return null;
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminUser();
  if (!admin) redirect("/login");

  return (
    <NotificationProvider>
      <div className="flex min-h-screen bg-[#0b0f19] text-white">
        <AdminSidebar admin={admin} />
        <div className="flex flex-1 flex-col lg:ml-64">
          <AdminTopBar admin={admin} />
          <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </NotificationProvider>
  );
}
