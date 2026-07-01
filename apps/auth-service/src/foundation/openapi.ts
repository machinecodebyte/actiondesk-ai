import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { FastifyInstance } from "fastify";
import type { ServiceEnv } from "./env.js";

type SwaggerApp = FastifyInstance & {
  swagger: () => unknown;
};

export async function registerOpenApi(app: FastifyInstance, env: ServiceEnv): Promise<void> {
  await app.register(swagger, {
    openapi: {
      openapi: "3.0.3",
      info: {
        title: "ActionDesk AI Auth Service",
        version: "0.1.0",
        description: "Internal auth, session, and workspace service."
      },
      servers: [{ url: `http://localhost:${env.PORT}` }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT"
          }
        }
      },
      tags: [{ name: "Health" }, { name: "Auth" }, { name: "Workspaces" }]
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
