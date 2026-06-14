import { publicProcedure, router } from "../trpc/procedures.js";

export function createPlaceholderRouter(moduleName: string) {
  return router({
    status: publicProcedure.query(() => ({
      module: moduleName,
      status: "not_implemented" as const,
      message: `${moduleName} routes are reserved for future product work.`
    }))
  });
}
