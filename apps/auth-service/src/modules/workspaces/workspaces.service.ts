import { randomBytes } from "node:crypto";
import type { Database } from "@actiondesk/db";
import { workspaceMembers, workspaces } from "@actiondesk/db";
import type { Workspace } from "@actiondesk/contracts";
import { and, eq } from "drizzle-orm";

export async function listUserWorkspaces(db: Database, userId: string): Promise<Workspace[]> {
  const rows = await db
    .select({
      workspace: workspaces
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(eq(workspaceMembers.userId, userId));

  return rows.map((row) => mapWorkspace(row.workspace));
}

export async function findWorkspaceForUser(
  db: Database,
  userId: string,
  workspaceId: string
): Promise<Workspace | null> {
  const [row] = await db
    .select({ workspace: workspaces })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, workspaceId)))
    .limit(1);

  return row ? mapWorkspace(row.workspace) : null;
}

export function workspaceSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  return `${base || "workspace"}-${randomBytes(3).toString("hex")}`;
}

export function mapWorkspace(row: typeof workspaces.$inferSelect): Workspace {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    ownerId: row.ownerId ?? row.id,
    corsairTenantId: row.corsairTenantId,
    createdAt: row.createdAt.toISOString()
  };
}
