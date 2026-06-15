import { z } from "zod";

const BrowserConfigSchema = z.object({
  appName: z.string().min(1),
  apiGatewayUrl: z.string().url()
});

export const foundationConfig = BrowserConfigSchema.parse({
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "ActionDesk AI",
  apiGatewayUrl: process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:4050"
});
