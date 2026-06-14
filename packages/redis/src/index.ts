import { Queue, type QueueOptions } from "bullmq";
import { Redis, type RedisOptions } from "ioredis";

export type RedisClientOptions = {
  url: string;
  keyPrefix?: string;
  lazyConnect?: boolean;
};

export function createRedisClient(options: RedisClientOptions): Redis {
  const redisOptions: RedisOptions = {
    keyPrefix: options.keyPrefix,
    lazyConnect: options.lazyConnect ?? true,
    maxRetriesPerRequest: null
  };

  return new Redis(options.url, redisOptions);
}

export function createQueue<TData = Record<string, unknown>>(
  name: string,
  connection: Redis,
  options: Omit<QueueOptions, "connection"> = {}
): Queue<TData, unknown, string> {
  return new Queue<TData, unknown, string>(name, {
    ...options,
    connection
  });
}

export async function closeRedisResources(resources: Array<{ close: () => Promise<unknown> }>): Promise<void> {
  await Promise.all(resources.map((resource) => resource.close()));
}
