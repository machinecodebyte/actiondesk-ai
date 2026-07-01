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
        title: "ActionDesk AI Mail Service",
        version: "0.1.0",
        description: "Internal Gmail cache and mail action service."
      },
      servers: [{ url: `http://localhost:${env.PORT}` }],
      tags: [{ name: "Health" }, { name: "Mail" }]
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
