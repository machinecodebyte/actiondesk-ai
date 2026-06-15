import { createDatabaseClient, type DatabaseClient } from "@actiondesk/db";
import type { ServiceEnv } from "./env.js";

export function createServiceDatabase(env: ServiceEnv): DatabaseClient {
  return createDatabaseClient({
    connectionString: env.DATABASE_URL,
    ssl: env.DATABASE_SSL
  });
}
