"use client";

import { FoundationProviders } from "@/modules/foundation/foundation.providers";

export function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
  return <FoundationProviders>{children}</FoundationProviders>;
}
