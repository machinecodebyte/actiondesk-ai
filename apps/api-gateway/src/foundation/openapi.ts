import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { FastifyInstance } from "fastify";
import type { GatewayEnv } from "./env.js";

type SwaggerApp = FastifyInstance & {
  swagger: () => unknown;
};

export async function registerOpenApi(app: FastifyInstance, env: GatewayEnv): Promise<void> {
  await app.register(swagger, {
    openapi: {
      openapi: "3.0.3",
      info: {
        title: "ActionDesk AI API Gateway",
        version: "0.1.0",
        description: "REST facade for ActionDesk AI auth, integrations, and core workflow testing."
      },
      servers: [{ url: env.API_GATEWAY_URL }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT"
          }
        }
      },
      tags: [
        { name: "Health" },
        { name: "Auth" },
        { name: "Workspaces" },
        { name: "Integrations" },
        { name: "Mail" },
        { name: "Calendar" },
        { name: "Commands" },
        { name: "Approvals" }
      ]
    }
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true
    }
  });

  app.get("/openapi.json", async () => (app as SwaggerApp).swagger());
}
