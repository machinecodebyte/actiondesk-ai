"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";
import { routes } from "@/lib/routes";

export type RouteGuardProps = {
  children: ReactNode;
  requireAuth?: boolean;
};

export function RouteGuard({ children, requireAuth = false }: RouteGuardProps) {
  const router = useRouter();
  const me = trpc.auth.me.useQuery(undefined, {
    enabled: requireAuth,
    retry: false
  });

  useEffect(() => {
    if (!requireAuth) {
      return;
    }

    if (me.isError) {
      router.replace(routes.login);
    }
  }, [me.isError, requireAuth, router]);

  if (!requireAuth) {
    return children;
  }

  if (me.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-mist px-6">
        <p className="text-sm font-medium text-slate-600">Loading workspace...</p>
      </main>
    );
  }

  return children;
}
