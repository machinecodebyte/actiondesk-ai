import {
  CreateCommandItemInputSchema,
  GetCommandItemInputSchema,
  ListCommandItemsInputSchema,
  SnoozeCommandInputSchema,
  UpdateCommandStatusInputSchema
} from "@actiondesk/contracts";
import { createCommandServiceClient } from "../clients/command-service.client.js";
import { publicProcedure, router } from "../trpc/procedures.js";
import { internalHeaders, requireCurrentUser, requireService } from "./internal-context.js";
import { mapServiceError } from "./router-errors.js";

export const commandsRouter = router({
  list: publicProcedure.input(ListCommandItemsInputSchema.partial().optional()).query(async ({ ctx, input }) => {
    try {
      const user = await requireCurrentUser(ctx);
      const parsed = ListCommandItemsInputSchema.parse(input ?? {});
      return await commandClient(ctx).list(parsed, internalHeaders(ctx, user));
    } catch (error) {
      return mapServiceError(error);
    }
  }),

  getById: publicProcedure.input(GetCommandItemInputSchema).query(async ({ ctx, input }) => {
    try {
      const user = await requireCurrentUser(ctx);
      return await commandClient(ctx).getById(input.id, internalHeaders(ctx, user));
    } catch (error) {
      return mapServiceError(error);
    }
  }),

  create: publicProcedure.input(CreateCommandItemInputSchema).mutation(async ({ ctx, input }) => {
    try {
      const user = await requireCurrentUser(ctx);
      return await commandClient(ctx).create(input, internalHeaders(ctx, user));
    } catch (error) {
      return mapServiceError(error);
    }
  }),

  updateStatus: publicProcedure.input(UpdateCommandStatusInputSchema).mutation(async ({ ctx, input }) => {
    try {
      const user = await requireCurrentUser(ctx);
      return await commandClient(ctx).updateStatus(input, internalHeaders(ctx, user));
    } catch (error) {
      return mapServiceError(error);
    }
  }),

  snooze: publicProcedure.input(SnoozeCommandInputSchema).mutation(async ({ ctx, input }) => {
    try {
      const user = await requireCurrentUser(ctx);
      return await commandClient(ctx).snooze(input, internalHeaders(ctx, user));
    } catch (error) {
      return mapServiceError(error);
    }
  }),

  dismiss: publicProcedure.input(GetCommandItemInputSchema).mutation(async ({ ctx, input }) => {
    try {
      const user = await requireCurrentUser(ctx);
      return await commandClient(ctx).dismiss(input.id, internalHeaders(ctx, user));
    } catch (error) {
      return mapServiceError(error);
    }
  }),

  markDone: publicProcedure.input(GetCommandItemInputSchema).mutation(async ({ ctx, input }) => {
    try {
      const user = await requireCurrentUser(ctx);
      return await commandClient(ctx).markDone(input.id, internalHeaders(ctx, user));
    } catch (error) {
      return mapServiceError(error);
    }
  })
});

function commandClient(ctx: Parameters<typeof requireCurrentUser>[0]) {
  const service = requireService(ctx, "command-service");
  return createCommandServiceClient(service.url, ctx.env.REQUEST_TIMEOUT_MS);
}
