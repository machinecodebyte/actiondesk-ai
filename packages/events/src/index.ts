import { z } from "zod";

export const EventTopic = {
  SERVICE_STARTED: "foundation.service.started",
  SERVICE_STOPPED: "foundation.service.stopped",
  SERVICE_HEALTH_CHANGED: "foundation.service.health_changed",
  WORKSPACE_CREATED: "workspace.created",
  WORKSPACE_MEMBER_ADDED: "workspace.member_added"
} as const;

export type EventTopic = (typeof EventTopic)[keyof typeof EventTopic];

export const EventEnvelopeSchema = z.object({
  id: z.string().uuid(),
  topic: z.string().min(1),
  version: z.number().int().positive().default(1),
  producer: z.string().min(1),
  occurredAt: z.string().datetime(),
  payload: z.record(z.unknown())
});

export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;

export type PublishOptions = {
  partitionKey?: string;
};

export interface EventPublisher {
  publish(event: EventEnvelope, options?: PublishOptions): Promise<void>;
}

export interface EventConsumer {
  subscribe(topic: EventTopic | string, handler: EventHandler): Promise<void>;
  close(): Promise<void>;
}

export type EventHandler = (event: EventEnvelope) => Promise<void>;

export type RedisEventPlaceholderOptions = {
  url: string;
  streamPrefix?: string;
};

export function createRedisEventPublisherPlaceholder(
  options: RedisEventPlaceholderOptions
): EventPublisher {
  return {
    async publish(): Promise<void> {
      throw new Error(
        `Redis event publishing is not wired yet for ${options.streamPrefix ?? "actiondesk"}.`
      );
    }
  };
}
