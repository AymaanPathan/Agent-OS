// frontend/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "AgentOS",
  description: "AgentOps Studio - Workflow Builder",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className="min-h-screen bg-white text-zinc-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
