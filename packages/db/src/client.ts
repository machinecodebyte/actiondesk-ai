import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import * as schema from "./schema/index.js";

export type Database = PostgresJsDatabase<typeof schema>;

export type DatabaseClient = {
  db: Database;
  sql: Sql;
  close: () => Promise<void>;
};

export type DatabaseClientOptions = {
  connectionString: string;
  maxConnections?: number;
  ssl?: boolean;
};

export function createDatabaseClient(options: DatabaseClientOptions): DatabaseClient {
  const sql = postgres(options.connectionString, {
    max: options.maxConnections ?? 10,
    ssl: options.ssl ? "require" : false
  });

  return {
    db: drizzle(sql, { schema }),
    sql,
    close: () => sql.end({ timeout: 5 })
  };
}
