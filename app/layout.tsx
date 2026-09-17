import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aviator Smart AI — Gaming Network Plan",
  description: "Network Marketing Meets Gaming Innovation. BEP20, 2X–5X tiers, 20 rewards.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
