import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aviator Pro — Gaming Network Plan",
  description: "Network Marketing Meets Gaming Innovation. BEP20, 3X/6X cap, 20 rewards.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
