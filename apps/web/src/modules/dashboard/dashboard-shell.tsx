"use client";

import { useRouter } from "next/navigation";
import { AppShell, Badge, Button, Card, CardBody, CardHeader } from "@actiondesk/ui";
import type { ConnectedAccount, IntegrationProvider } from "@actiondesk/contracts";
import { trpc } from "@/lib/trpc";
import { FoundationHealthBanner } from "@/modules/foundation/foundation.health-banner";
import { RouteGuard } from "@/modules/foundation/foundation.route-guard";
import { routes } from "@/lib/routes";

const navItems = [
  { label: "Dashboard", href: routes.dashboard, active: true },
  { label: "Onboarding", href: routes.onboarding },
  { label: "Action Inbox", href: routes.dashboard },
  { label: "Calendar", href: routes.dashboard },
  { label: "Agent Command", href: routes.dashboard },
  { label: "Settings", href: routes.dashboard }
];

const integrationProviders: Array<{ provider: IntegrationProvider; label: string }> = [
  { provider: "gmail", label: "Gmail" },
  { provider: "google_calendar", label: "Google Calendar" }
];

const panels = [
  {
    title: "Action Inbox",
    tone: "green" as const,
    copy: "Future email-derived command items will appear here after integrations are built."
  },
  {
    title: "Calendar Panel",
    tone: "blue" as const,
    copy: "Availability, conflicts, and calendar actions are reserved for a later module."
  },
  {
    title: "Agent Command",
    tone: "amber" as const,
    copy: "The agent command surface is present without tool execution or AI orchestration."
  }
];

export function DashboardShell() {
  const router = useRouter();
  const integrations = trpc.integrations.status.useQuery(undefined, { retry: false });
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
        navItems={navItems}
        topbar={
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Workspace</p>
              <h1 className="text-lg font-semibold text-ink">Command center</h1>
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
        <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
          <section className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              {integrationProviders.map((item) => (
                <IntegrationStatusCard
                  account={integrations.data?.accounts.find(
                    (account) => account.provider === item.provider
                  )}
                  isLoading={integrations.isLoading}
                  key={item.provider}
                  label={item.label}
                />
              ))}
            </div>
            <section className="grid gap-5 lg:grid-cols-3">
              {panels.map((panel) => (
                <Card key={panel.title}>
                  <CardHeader className="flex items-center justify-between gap-3">
                    <h2 className="font-semibold text-slate-950">{panel.title}</h2>
                    <Badge tone={panel.tone}>Empty</Badge>
                  </CardHeader>
                  <CardBody>
                    <p className="text-sm leading-6 text-slate-600">{panel.copy}</p>
                    <div className="mt-5 flex h-24 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 text-center text-sm text-slate-500">
                      Connect Gmail and Calendar to start building your command center.
                    </div>
                  </CardBody>
                </Card>
              ))}
            </section>
          </section>
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-slate-950">Integration Health</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              {integrations.error ? (
                <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {integrations.error.message}
                </p>
              ) : null}
              {integrationProviders.map((item) => {
                const account = integrations.data?.accounts.find(
                  (current) => current.provider === item.provider
                );
                const status = account?.status ?? "disconnected";

                return (
                  <div key={item.provider} className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-slate-700">{item.label}</span>
                    <Badge tone={statusTone(status)}>{integrations.isLoading ? "loading" : status}</Badge>
                  </div>
                );
              })}
            </CardBody>
          </Card>
        </div>
      </AppShell>
    </RouteGuard>
  );
}

function IntegrationStatusCard({
  account,
  isLoading,
  label
}: {
  account: ConnectedAccount | undefined;
  isLoading: boolean;
  label: string;
}) {
  const status = account?.status ?? "disconnected";

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-950">{label}</h2>
        <Badge tone={statusTone(status)}>{isLoading ? "loading" : status}</Badge>
      </CardHeader>
      <CardBody>
        <p className="text-sm leading-6 text-slate-600">
          {status === "connected"
            ? "Connected and ready for later workflow phases."
            : "Not connected. Finish onboarding before ActionDesk AI can use this source."}
        </p>
      </CardBody>
    </Card>
  );
}

function statusTone(status: ConnectedAccount["status"]) {
  if (status === "connected") {
    return "green";
  }
  if (status === "connecting") {
    return "blue";
  }
  if (status === "error") {
    return "amber";
  }

  return "neutral";
}
