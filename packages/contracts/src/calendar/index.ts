import { z } from "zod";
import { IdSchema, PaginationInputSchema, PaginationMetaSchema, TimestampSchema } from "../common/index.js";

export const CalendarEventSchema = z.object({
  id: IdSchema,
  workspaceId: IdSchema,
  provider: z.literal("google_calendar"),
  providerEventId: z.string().min(1),
  title: z.string().nullable(),
  description: z.string().nullable(),
  location: z.string().nullable(),
  startAt: TimestampSchema.nullable(),
  endAt: TimestampSchema.nullable(),
  timezone: z.string().nullable(),
  attendees: z.array(z.string()).nullable(),
  status: z.string().nullable(),
  rawMetadata: z.record(z.unknown()).nullable(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema
});

export const ListCalendarEventsInputSchema = PaginationInputSchema.extend({
  startAt: TimestampSchema.optional(),
  endAt: TimestampSchema.optional()
});

export const ListCalendarEventsResponseSchema = z.object({
  events: z.array(CalendarEventSchema),
  pagination: PaginationMetaSchema
});

export const GetCalendarEventInputSchema = z.object({
  id: IdSchema
});

export const GetAvailabilityInputSchema = z.object({
  startAt: TimestampSchema,
  endAt: TimestampSchema,
  durationMinutes: z.number().int().min(15).max(480).default(30)
});

export const AvailabilitySlotSchema = z.object({
  startAt: TimestampSchema,
  endAt: TimestampSchema
});

export const AvailabilityResponseSchema = z.object({
  slots: z.array(AvailabilitySlotSchema),
  message: z.string().optional()
});

export const CreateCalendarEventInputSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(10000).optional(),
  location: z.string().trim().max(500).optional(),
  startAt: TimestampSchema,
  endAt: TimestampSchema,
  timezone: z.string().trim().min(1).max(100).optional(),
  attendees: z.array(z.string().email()).default([])
});

export const UpdateCalendarEventInputSchema = CreateCalendarEventInputSchema.partial().extend({
  id: IdSchema
});

export const CreateCalendarEventResponseSchema = z.object({
  event: CalendarEventSchema.nullable(),
  message: z.string().optional()
});

export const SyncCalendarInputSchema = z.object({
  startAt: TimestampSchema.optional(),
  endAt: TimestampSchema.optional(),
  limit: z.number().int().min(1).max(250).default(100)
});

export type CalendarEvent = z.infer<typeof CalendarEventSchema>;
export type ListCalendarEventsInput = z.infer<typeof ListCalendarEventsInputSchema>;
export type ListCalendarEventsResponse = z.infer<typeof ListCalendarEventsResponseSchema>;
export type GetCalendarEventInput = z.infer<typeof GetCalendarEventInputSchema>;
export type GetAvailabilityInput = z.infer<typeof GetAvailabilityInputSchema>;
export type AvailabilitySlot = z.infer<typeof AvailabilitySlotSchema>;
export type AvailabilityResponse = z.infer<typeof AvailabilityResponseSchema>;
export type CreateCalendarEventInput = z.infer<typeof CreateCalendarEventInputSchema>;
export type UpdateCalendarEventInput = z.infer<typeof UpdateCalendarEventInputSchema>;
export type CreateCalendarEventResponse = z.infer<typeof CreateCalendarEventResponseSchema>;
export type SyncCalendarInput = z.infer<typeof SyncCalendarInputSchema>;
