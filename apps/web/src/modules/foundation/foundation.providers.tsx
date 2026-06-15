"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useState, type ReactNode } from "react";
import superjson from "superjson";
import { foundationConfig } from "./foundation.config";
import { FoundationErrorBoundary } from "./foundation.error-boundary";
import { ToastProvider } from "./foundation.toasts";
import { trpc } from "@/lib/trpc";

export function FoundationProviders({ children }: Readonly<{ children: ReactNode }>) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      transformer: superjson,
      links: [
        httpBatchLink({
          url: `${foundationConfig.apiGatewayUrl}/trpc`,
          fetch(url, options) {
            return fetch(url, {
              ...options,
              credentials: "include"
            });
          },
          headers() {
            return {
              "x-request-id": crypto.randomUUID()
            };
          }
        })
      ]
    })
  );

  return (
    <FoundationErrorBoundary>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>{children}</ToastProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </FoundationErrorBoundary>
  );
}
