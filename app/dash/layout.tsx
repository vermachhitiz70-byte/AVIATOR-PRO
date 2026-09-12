import { DashTop, DashBottom } from "@/components/dash";
export default function DashLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-[#060b16]">
      <DashTop />
      <main className="flex-1 px-3 py-3">{children}</main>
      <DashBottom />
    </div>
  );
}
