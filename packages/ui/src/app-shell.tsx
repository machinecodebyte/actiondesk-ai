import type { ReactNode } from "react";
import { cn } from "./lib/cn.js";

export type AppShellNavItem = {
  label: string;
  href: string;
  active?: boolean;
};

export type AppShellProps = {
  title: string;
  navItems: AppShellNavItem[];
  topbar?: ReactNode;
  children: ReactNode;
};

export function AppShell({ title, navItems, topbar, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white p-5 md:block">
        <div className="text-lg font-semibold">{title}</div>
        <nav className="mt-8 space-y-1">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100",
                item.active && "bg-slate-950 text-white hover:bg-slate-950"
              )}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </aside>
      <div className="md:pl-64">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-5 py-3">
          {topbar}
        </header>
        <main className="p-5">{children}</main>
      </div>
    </div>
  );
}
