import {
  ApproveActionInputSchema,
  CreateApprovalInputSchema,
  ListApprovalsInputSchema,
  RejectActionInputSchema
} from "@actiondesk/contracts";
import { createCommandServiceClient } from "../clients/command-service.client.js";
import { publicProcedure, router } from "../trpc/procedures.js";
import { internalHeaders, requireCurrentUser, requireService } from "./internal-context.js";
import { mapServiceError } from "./router-errors.js";

export const approvalsRouter = router({
  list: publicProcedure.input(ListApprovalsInputSchema.partial().optional()).query(async ({ ctx, input }) => {
    try {
      const user = await requireCurrentUser(ctx);
      const parsed = ListApprovalsInputSchema.parse(input ?? {});
      return await commandClient(ctx).listApprovals(parsed, internalHeaders(ctx, user));
    } catch (error) {
      return mapServiceError(error);
    }
  }),

  create: publicProcedure.input(CreateApprovalInputSchema).mutation(async ({ ctx, input }) => {
    try {
      const user = await requireCurrentUser(ctx);
      return await commandClient(ctx).createApproval(input, internalHeaders(ctx, user));
    } catch (error) {
      return mapServiceError(error);
    }
  }),

  approve: publicProcedure.input(ApproveActionInputSchema).mutation(async ({ ctx, input }) => {
    try {
      const user = await requireCurrentUser(ctx);
      return await commandClient(ctx).approve(input, internalHeaders(ctx, user));
    } catch (error) {
      return mapServiceError(error);
    }
  }),

  reject: publicProcedure.input(RejectActionInputSchema).mutation(async ({ ctx, input }) => {
    try {
      const user = await requireCurrentUser(ctx);
      return await commandClient(ctx).reject(input, internalHeaders(ctx, user));
    } catch (error) {
      return mapServiceError(error);
    }
  })
});

function commandClient(ctx: Parameters<typeof requireCurrentUser>[0]) {
  const service = requireService(ctx, "command-service");
  return createCommandServiceClient(service.url, ctx.env.REQUEST_TIMEOUT_MS);
}
