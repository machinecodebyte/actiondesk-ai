"use client";

import Link from "next/link";
import { Badge, Button, Card, CardBody, CardHeader } from "@actiondesk/ui";
import type { ConnectedAccount, IntegrationProvider } from "@actiondesk/contracts";
import { routes } from "@/lib/routes";
import { trpc } from "@/lib/trpc";
import { DashboardFrame } from "./dashboard-frame";

const providers: Array<{ provider: IntegrationProvider; label: string }> = [
  { provider: "gmail", label: "Gmail" },
  { provider: "google_calendar", label: "Google Calendar" }
];

export function DashboardShell() {
  const integrations = trpc.integrations.status.useQuery(undefined, { retry: false });
  const mail = trpc.mail.listThreads.useQuery({ pageSize: 1 }, { retry: false });
  const calendar = trpc.calendar.listEvents.useQuery({ pageSize: 1 }, { retry: false });
  const commands = trpc.commands.list.useQuery({ status: "open", pageSize: 1 }, { retry: false });
  const approvals = trpc.approvals.list.useQuery({ status: "pending", pageSize: 1 }, { retry: false });

  return (
    <DashboardFrame active={routes.dashboard} title="Command center">
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <section className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            {providers.map((provider) => (
              <IntegrationStatusCard
                account={integrations.data?.accounts.find((account) => account.provider === provider.provider)}
                isLoading={integrations.isLoading}
                key={provider.provider}
                label={provider.label}
              />
            ))}
          </div>
          <section className="grid gap-5 lg:grid-cols-4">
            <MetricCard href={routes.inbox} label="Cached threads" value={mail.data?.pagination.totalItems ?? 0} />
            <MetricCard href={routes.calendar} label="Cached events" value={calendar.data?.pagination.totalItems ?? 0} />
            <MetricCard href={routes.commands} label="Open commands" value={commands.data?.pagination.totalItems ?? 0} />
            <MetricCard href={routes.approvals} label="Pending approvals" value={approvals.data?.pagination.totalItems ?? 0} />
          </section>
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-slate-950">Next workflow step</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <p className="text-sm leading-6 text-slate-600">
                Use manual sync after Gmail or Google Calendar is connected. If Corsair live provider operations are not configured yet, sync and provider actions will return a clear setup message without inserting fake data.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href={routes.onboarding}>
                  <Button>Connect sources</Button>
                </Link>
                <Link href={routes.commands}>
                  <Button variant="secondary">Create command item</Button>
                </Link>
              </div>
            </CardBody>
          </Card>
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
            {providers.map((provider) => {
              const account = integrations.data?.accounts.find((item) => item.provider === provider.provider);
              const status = account?.status ?? "disconnected";

              return (
                <div key={provider.provider} className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-slate-700">{provider.label}</span>
                  <Badge tone={statusTone(status)}>{integrations.isLoading ? "loading" : status}</Badge>
                </div>
              );
            })}
          </CardBody>
        </Card>
      </div>
    </DashboardFrame>
  );
}

function MetricCard({ href, label, value }: { href: string; label: string; value: number }) {
  return (
    <Link href={href}>
      <Card className="h-full hover:border-slate-300">
        <CardBody>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
        </CardBody>
      </Card>
    </Link>
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
            ? "Connected in persisted integration state."
            : "Not connected. Finish onboarding before live sync can run."}
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
