import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WristBridge",
  description: "Turn any PWA into a native Apple Watch app.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
