import type { Database } from "@actiondesk/db";
import { users } from "@actiondesk/db";
import { eq } from "drizzle-orm";

export async function findUserByEmail(db: Database, email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user ?? null;
}

export async function findUserById(db: Database, userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return user ?? null;
}
