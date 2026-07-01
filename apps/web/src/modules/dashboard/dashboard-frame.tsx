"use client";

import { useRouter } from "next/navigation";
import { AppShell, Button } from "@actiondesk/ui";
import { FoundationHealthBanner } from "@/modules/foundation/foundation.health-banner";
import { RouteGuard } from "@/modules/foundation/foundation.route-guard";
import { routes } from "@/lib/routes";
import { trpc } from "@/lib/trpc";

const navItems = [
  { label: "Dashboard", href: routes.dashboard },
  { label: "Inbox", href: routes.inbox },
  { label: "Calendar", href: routes.calendar },
  { label: "Commands", href: routes.commands },
  { label: "Approvals", href: routes.approvals },
  { label: "Onboarding", href: routes.onboarding }
];

export function DashboardFrame({
  active,
  children,
  title
}: Readonly<{
  active: string;
  children: React.ReactNode;
  title: string;
}>) {
  const router = useRouter();
  const logout = trpc.auth.logout.useMutation();

  async function handleLogout() {
    try {
      await logout.mutateAsync({});
    } finally {
      router.replace(routes.login);
    }
  }

  return (
    <RouteGuard requireAuth>
      <AppShell
        title="ActionDesk AI"
        navItems={navItems.map((item) => ({ ...item, active: item.href === active }))}
        topbar={
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Workspace</p>
              <h1 className="text-lg font-semibold text-ink">{title}</h1>
            </div>
            <div className="flex items-center gap-3">
              <FoundationHealthBanner />
              <Button disabled={logout.isLoading} onClick={() => void handleLogout()} variant="secondary">
                Logout
              </Button>
            </div>
          </div>
        }
      >
        {children}
      </AppShell>
    </RouteGuard>
  );
}
