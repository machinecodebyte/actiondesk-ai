import { initTRPC } from "@trpc/server";
import superjson from "superjson";

export type BaseTrpcContext = {
  requestId: string;
};

export function createTrpcHelpers<TContext extends BaseTrpcContext>() {
  const trpc = initTRPC.context<TContext>().create({
    transformer: superjson
  });

  return {
    router: trpc.router,
    procedure: trpc.procedure,
    middleware: trpc.middleware,
    mergeRouters: trpc.mergeRouters
  };
}

export const baseTrpc = createTrpcHelpers<BaseTrpcContext>();
