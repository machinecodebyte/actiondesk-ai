"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Badge, Card, CardBody } from "@actiondesk/ui";
import type { IntegrationProvider } from "@actiondesk/contracts";
import { routes } from "@/lib/routes";
import { trpc } from "@/lib/trpc";
import { RouteGuard } from "@/modules/foundation/foundation.route-guard";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackShell message="Loading provider callback..." tone="blue" />}>
      <AuthCallbackContent />
    </Suspense>
  );
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const completeConnection = trpc.integrations.completeConnection.useMutation();
  const started = useRef(false);
  const [message, setMessage] = useState("Completing provider connection...");
  const [tone, setTone] = useState<"blue" | "green" | "red">("blue");

  useEffect(() => {
    if (started.current) {
      return;
    }

    started.current = true;
    const provider = readProvider(searchParams.get("provider"));
    const state = searchParams.get("state");
    const code = searchParams.get("code");

    if (!provider || !state) {
      setTone("red");
      setMessage("Provider callback is missing required connection details.");
      return;
    }

    async function complete(providerValue: IntegrationProvider, stateValue: string) {
      try {
        await completeConnection.mutateAsync({
          provider: providerValue,
          state: stateValue,
          ...(code ? { code } : {})
        });
        setTone("green");
        setMessage("Connection completed. Returning to onboarding...");
        window.setTimeout(() => router.replace(routes.onboarding), 1200);
      } catch (error) {
        setTone("red");
        setMessage(error instanceof Error ? error.message : "Unable to complete connection.");
      }
    }

    void complete(provider, state);
  }, [completeConnection, router, searchParams]);

  return (
    <RouteGuard requireAuth>
      <CallbackShell message={message} tone={tone} />
    </RouteGuard>
  );
}

function CallbackShell({ message, tone }: { message: string; tone: "blue" | "green" | "red" }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-mist px-6">
      <Card className="w-full max-w-md">
        <CardBody className="space-y-4">
          <Badge tone={tone}>{tone === "red" ? "Connection issue" : "Provider callback"}</Badge>
          <h1 className="text-2xl font-semibold text-ink">Integration callback</h1>
          <p className="text-sm leading-6 text-slate-600">{message}</p>
          <Link className="inline-flex text-sm font-medium text-action" href={routes.onboarding}>
            Back to onboarding
          </Link>
        </CardBody>
      </Card>
    </main>
  );
}

function readProvider(value: string | null): IntegrationProvider | null {
  if (value === "gmail" || value === "google_calendar") {
    return value;
  }

  return null;
}
