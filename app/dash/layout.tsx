import { DashBackButton, DashBottom, DashSidebar, DashTop, DashTopBar } from "@/components/dash";

export default function DashLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#060b16] text-white">
      <DashSidebar />
      <div className="lg:pl-64">
        <div className="lg:hidden">
          <DashTop />
        </div>
        <DashTopBar />
        <main className="mx-auto w-full max-w-md px-3 py-3 lg:max-w-6xl lg:px-8 lg:py-6">
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
