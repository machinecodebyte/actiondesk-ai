import {
  CreateCalendarEventInputSchema,
  GetAvailabilityInputSchema,
  GetCalendarEventInputSchema,
  ListCalendarEventsInputSchema,
  SyncCalendarInputSchema,
  UpdateCalendarEventInputSchema
} from "@actiondesk/contracts";
import { createCalendarServiceClient } from "../clients/calendar-service.client.js";
import { publicProcedure, router } from "../trpc/procedures.js";
import { internalHeaders, requireCurrentUser, requireService } from "./internal-context.js";
import { mapServiceError } from "./router-errors.js";

export const calendarRouter = router({
  listEvents: publicProcedure.input(ListCalendarEventsInputSchema.partial().optional()).query(async ({ ctx, input }) => {
    try {
      const user = await requireCurrentUser(ctx);
      const parsed = ListCalendarEventsInputSchema.parse(input ?? {});
      return await calendarClient(ctx).listEvents(parsed, internalHeaders(ctx, user));
    } catch (error) {
      return mapServiceError(error);
    }
  }),

  getEvent: publicProcedure.input(GetCalendarEventInputSchema).query(async ({ ctx, input }) => {
    try {
      const user = await requireCurrentUser(ctx);
      return await calendarClient(ctx).getEvent(input.id, internalHeaders(ctx, user));
    } catch (error) {
      return mapServiceError(error);
    }
  }),

  sync: publicProcedure.input(SyncCalendarInputSchema.partial().optional()).mutation(async ({ ctx, input }) => {
    try {
      const user = await requireCurrentUser(ctx);
      const parsed = SyncCalendarInputSchema.parse(input ?? {});
      return await calendarClient(ctx).sync(parsed, internalHeaders(ctx, user));
    } catch (error) {
      return mapServiceError(error);
    }
  }),

  availability: publicProcedure.input(GetAvailabilityInputSchema).mutation(async ({ ctx, input }) => {
    try {
      const user = await requireCurrentUser(ctx);
      return await calendarClient(ctx).availability(input, internalHeaders(ctx, user));
    } catch (error) {
      return mapServiceError(error);
    }
  }),

  createEvent: publicProcedure.input(CreateCalendarEventInputSchema).mutation(async ({ ctx, input }) => {
    try {
      const user = await requireCurrentUser(ctx);
      return await calendarClient(ctx).createEvent(input, internalHeaders(ctx, user));
    } catch (error) {
      return mapServiceError(error);
    }
  }),

  updateEvent: publicProcedure.input(UpdateCalendarEventInputSchema).mutation(async ({ ctx, input }) => {
    try {
      const user = await requireCurrentUser(ctx);
      return await calendarClient(ctx).updateEvent(input, internalHeaders(ctx, user));
    } catch (error) {
      return mapServiceError(error);
    }
  }),

  deleteEvent: publicProcedure.input(GetCalendarEventInputSchema).mutation(async ({ ctx, input }) => {
    try {
      const user = await requireCurrentUser(ctx);
      return await calendarClient(ctx).deleteEvent(input.id, internalHeaders(ctx, user));
    } catch (error) {
      return mapServiceError(error);
    }
  })
});

function calendarClient(ctx: Parameters<typeof requireCurrentUser>[0]) {
  const service = requireService(ctx, "calendar-service");
  return createCalendarServiceClient(service.url, ctx.env.REQUEST_TIMEOUT_MS);
}
