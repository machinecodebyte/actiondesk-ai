import {
  CreateDraftReplyInputSchema,
  GetMailThreadInputSchema,
  ListMailThreadsInputSchema,
  SyncMailInputSchema
} from "@actiondesk/contracts";
import { createMailServiceClient } from "../clients/mail-service.client.js";
import { publicProcedure, router } from "../trpc/procedures.js";
import { internalHeaders, requireCurrentUser, requireService } from "./internal-context.js";
import { mapServiceError } from "./router-errors.js";

export const mailRouter = router({
  listThreads: publicProcedure.input(ListMailThreadsInputSchema.partial().optional()).query(async ({ ctx, input }) => {
    try {
      const user = await requireCurrentUser(ctx);
      const parsed = ListMailThreadsInputSchema.parse(input ?? {});
      return await mailClient(ctx).listThreads(parsed, internalHeaders(ctx, user));
    } catch (error) {
      return mapServiceError(error);
    }
  }),

  getThread: publicProcedure.input(GetMailThreadInputSchema).query(async ({ ctx, input }) => {
    try {
      const user = await requireCurrentUser(ctx);
      return await mailClient(ctx).getThread(input.id, internalHeaders(ctx, user));
    } catch (error) {
      return mapServiceError(error);
    }
  }),

  sync: publicProcedure.input(SyncMailInputSchema.partial().optional()).mutation(async ({ ctx, input }) => {
    try {
      const user = await requireCurrentUser(ctx);
      const parsed = SyncMailInputSchema.parse(input ?? {});
      return await mailClient(ctx).sync(parsed, internalHeaders(ctx, user));
    } catch (error) {
      return mapServiceError(error);
    }
  }),

  createDraftReply: publicProcedure.input(CreateDraftReplyInputSchema).mutation(async ({ ctx, input }) => {
    try {
      const user = await requireCurrentUser(ctx);
      return await mailClient(ctx).createDraftReply(input, internalHeaders(ctx, user));
    } catch (error) {
      return mapServiceError(error);
    }
  }),

  archive: publicProcedure.input(GetMailThreadInputSchema).mutation(async ({ ctx, input }) => {
    try {
      const user = await requireCurrentUser(ctx);
      return await mailClient(ctx).archive(input.id, internalHeaders(ctx, user));
    } catch (error) {
      return mapServiceError(error);
    }
  }),

  markRead: publicProcedure.input(GetMailThreadInputSchema).mutation(async ({ ctx, input }) => {
    try {
      const user = await requireCurrentUser(ctx);
      return await mailClient(ctx).markRead(input.id, internalHeaders(ctx, user));
    } catch (error) {
      return mapServiceError(error);
    }
  }),

  markUnread: publicProcedure.input(GetMailThreadInputSchema).mutation(async ({ ctx, input }) => {
    try {
      const user = await requireCurrentUser(ctx);
      return await mailClient(ctx).markUnread(input.id, internalHeaders(ctx, user));
    } catch (error) {
      return mapServiceError(error);
    }
  })
});

function mailClient(ctx: Parameters<typeof requireCurrentUser>[0]) {
  const service = requireService(ctx, "mail-service");
  return createMailServiceClient(service.url, ctx.env.REQUEST_TIMEOUT_MS);
}
