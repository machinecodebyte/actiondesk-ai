"use client";

import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@actiondesk/api-gateway";

export const trpc = createTRPCReact<AppRouter>();
