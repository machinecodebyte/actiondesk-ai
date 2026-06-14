import type { Database } from "./client.js";

export type DatabaseTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export function withTransaction<T>(
  db: Database,
  work: (tx: DatabaseTransaction) => Promise<T>
): Promise<T> {
  return db.transaction(work);
}
