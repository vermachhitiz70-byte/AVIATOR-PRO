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
    const row = r.rows[0] as unknown as { id: unknown; name: unknown; email: unknown; referral_code: unknown; is_admin: unknown };
    return {
      id: String(row.id ?? ""),
      name: String(row.name ?? ""),
      email: String(row.email ?? ""),
      referral_code: String(row.referral_code ?? ""),
      is_admin: Number(row.is_admin ?? 0),
    };
  } catch {
    return null;
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminUser();
  if (!admin) redirect("/login");

  return (
    <NotificationProvider>
      <div className="flex min-h-screen overflow-x-clip bg-[#faf6ec] text-gray-900">
        <AdminSidebar admin={admin} />
        <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
          <AdminTopBar admin={admin} />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
        </div>
      </div>
    </NotificationProvider>
  );
}
