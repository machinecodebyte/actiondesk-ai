import type { z } from "zod";

export function validateInput<TSchema extends z.ZodType>(schema: TSchema, input: unknown): z.infer<TSchema> {
  return schema.parse(input);
}
