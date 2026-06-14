"use client";

import type { ReactNode } from "react";

export type RouteGuardProps = {
  children: ReactNode;
  requireAuth?: boolean;
};

export function RouteGuard({ children }: RouteGuardProps) {
  return children;
}
