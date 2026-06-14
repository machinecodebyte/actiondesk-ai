import { z } from "zod";

export const MetadataResponseSchema = z.object({
  service: z.string().min(1),
  version: z.string().min(1),
  environment: z.string().min(1),
  uptime: z.number().nonnegative(),
  timestamp: z.string().datetime()
});

export type MetadataResponse = z.infer<typeof MetadataResponseSchema>;
