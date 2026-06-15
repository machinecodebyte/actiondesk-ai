"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Card, CardBody, CardHeader } from "@actiondesk/ui";
import type { ConnectedAccount, IntegrationProvider } from "@actiondesk/contracts";
import { routes } from "@/lib/routes";
import { trpc } from "@/lib/trpc";
import { RouteGuard } from "@/modules/foundation/foundation.route-guard";

const providers: Array<{ provider: IntegrationProvider; title: string; copy: string }> = [
  {
    provider: "gmail",
    title: "Gmail",
    copy: "Connect Gmail when Corsair is configured to enable future email workflows."
  },
  {
    provider: "google_calendar",
    title: "Google Calendar",
    copy: "Connect Calendar when Corsair is configured to enable future scheduling workflows."
  }
];

export default function OnboardingPage() {
  const utils = trpc.useContext();
  const status = trpc.integrations.status.useQuery(undefined, { retry: false });
  const startConnection = trpc.integrations.startConnection.useMutation();
  const [message, setMessage] = useState<string | null>(null);

  const accounts = status.data?.accounts ?? [];
  const allConnected =
    accounts.length === providers.length && accounts.every((account) => account.status === "connected");

  async function connectProvider(provider: IntegrationProvider) {
    setMessage(null);

    try {
      const result = await startConnection.mutateAsync({
        provider,
        redirectUrl: `${window.location.origin}${routes.authCallback}?provider=${provider}`
      });

      await utils.integrations.status.invalidate();

      if (result.connectUrl) {
        window.location.assign(result.connectUrl);
        return;
      }

      setMessage(result.message ?? "Connection started.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start connection");
      await utils.integrations.status.invalidate();
    }
  }

  return (
    <RouteGuard requireAuth>
      <main className="min-h-screen bg-mist px-6 py-10">
        <section className="mx-auto max-w-5xl">
          <Badge tone="blue">Workspace onboarding</Badge>
          <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="text-3xl font-semibold text-ink">Connect your sources</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                ActionDesk AI needs Gmail and Google Calendar connected before future command-center
                workflows can run.
              </p>
            </div>
            {allConnected ? (
              <Link
                className="inline-flex h-10 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800"
                href={routes.dashboard}
              >
                Continue to dashboard
              </Link>
            ) : (
              <button
                className="inline-flex h-10 cursor-not-allowed items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-400"
                disabled
                type="button"
              >
                Connect both sources first
              </button>
            )}
          </div>
          {message ? (
            <p className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {message}
            </p>
          ) : null}
          {status.error ? (
            <p className="mt-6 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {status.error.message}
            </p>
          ) : null}
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {providers.map((provider) => (
              <ConnectionCard
                account={accounts.find((account) => account.provider === provider.provider)}
                disabled={startConnection.isLoading || status.isLoading}
                key={provider.provider}
                onConnect={() => void connectProvider(provider.provider)}
                title={provider.title}
                copy={provider.copy}
              />
            ))}
          </div>
        </section>
      </main>
    </RouteGuard>
  );
}

function ConnectionCard({
  account,
  copy,
  disabled,
  onConnect,
  title
}: {
  account: ConnectedAccount | undefined;
  copy: string;
  disabled: boolean;
  onConnect: () => void;
  title: string;
}) {
  const status = account?.status ?? "disconnected";

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-950">{title}</h2>
        <Badge tone={statusTone(status)}>{status.replace("_", " ")}</Badge>
      </CardHeader>
      <CardBody>
        <p className="text-sm leading-6 text-slate-600">{copy}</p>
        {account?.errorMessage ? (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {account.errorMessage}
          </p>
        ) : null}
        <Button
          className="mt-5 w-full"
          disabled={disabled || status === "connected"}
          onClick={onConnect}
          variant={status === "connected" ? "secondary" : "primary"}
        >
          {status === "connected" ? "Connected" : `Connect ${title}`}
        </Button>
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
