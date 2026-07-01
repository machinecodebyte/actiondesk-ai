import assert from "node:assert/strict";
import { test } from "node:test";
import Fastify from "fastify";
import { registerMailRoutes } from "../src/modules/threads/threads.routes.js";

test("mail sync returns 501 when Gmail is connected but live Corsair sync is not implemented", async () => {
  const app = Fastify({ logger: false });
  app.setErrorHandler((error, _request, reply) => {
    reply.code(statusCode(error)).send({ error: { code: errorCode(error), message: error.message } });
  });
  await registerMailRoutes(app, { db: connectedFakeDb() });

  const response = await app.inject({
    method: "POST",
    url: "/mail/sync",
    headers: contextHeaders(),
    payload: {}
  });

  assert.equal(response.statusCode, 501);
  assert.match(response.body, /Live Gmail sync is not configured/);
  await app.close();
});

function connectedFakeDb() {
  return {
    select() {
      return {
        from() {
          return {
            where() {
              return {
                limit() {
                  return Promise.resolve([{ status: "connected" }]);
                }
              };
            }
          };
        }
      };
    },
    insert() {
      return {
        values() {
          return Promise.resolve();
        }
      };
    }
  } as never;
}

function statusCode(error: Error): number {
  const value = Reflect.get(error, "statusCode");
  return typeof value === "number" ? value : 500;
}

function errorCode(error: Error): string {
  const value = Reflect.get(error, "code");
  return typeof value === "string" ? value : "INTERNAL_ERROR";
}

function contextHeaders() {
  return {
    "x-actiondesk-user-id": "11111111-1111-4111-8111-111111111111",
    "x-actiondesk-workspace-id": "22222222-2222-4222-8222-222222222222",
    "x-actiondesk-request-id": "test-request"
  };
}
