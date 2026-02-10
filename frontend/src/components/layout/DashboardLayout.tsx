"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const nav = [
  { name: "Builder", href: "/builder" },
  { name: "Runs Console", href: "/runs" },
  { name: "Workflows", href: "/workflows" },
];

export default function DashboardLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-[250px] border-r bg-zinc-50 p-4">
        <div className="mb-6">
          <div className="text-xl font-semibold">AgentOS</div>
          <div className="text-sm text-muted-foreground">
            Visual Agent Workflow Studio
          </div>
        </div>

        <nav className="flex flex-col gap-2">
          {nav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm transition",
                  isActive
                    ? "bg-background shadow-sm border"
                    : "hover:bg-background/70",
                )}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6">
          <Button variant="outline" className="w-full">
            + New Workflow
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1">
        <header className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold">{title}</h1>
            <p className="text-sm text-muted-foreground">
              Manage and run workflows with live tool execution logs.
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary">Connect Archestra</Button>
            <Button>Run</Button>
          </div>
        </header>

        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
