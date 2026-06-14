import type { FastifyRequest } from "fastify";

export type AuthContext = {
  userId: string | null;
  workspaceId: string | null;
};

export function createAuthContext(_request: FastifyRequest): AuthContext {
  return {
    userId: null,
    workspaceId: null
  };
}
