import { toNodeHandler } from "better-auth/node";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { IncomingMessage, ServerResponse } from "node:http";

import type { BetterAuthInstance } from "./better-auth.config.js";

const authPathPrefix = "/api/v1/auth";
const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:5173";

interface AuthRawRequest extends IncomingMessage {
  baseUrl?: string;
  originalUrl?: string;
}

function applyCorsHeaders(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", webOrigin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, DELETE, OPTIONS",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Request-Id",
  );
  res.setHeader("Vary", "Origin");
}

export async function registerBetterAuth(
  app: FastifyInstance,
  auth: BetterAuthInstance,
): Promise<void> {
  const handler = toNodeHandler(auth);

  app.addHook(
    "onRequest",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const raw = request.raw as AuthRawRequest;
      const originalUrl = raw.url ?? "";

      if (!originalUrl.startsWith(authPathPrefix)) {
        return;
      }

      applyCorsHeaders(reply.raw);

      if (request.method === "OPTIONS") {
        reply.hijack();
        reply.raw.statusCode = 204;
        reply.raw.end();
        return;
      }

      const queryIndex = originalUrl.indexOf("?");
      const path =
        queryIndex >= 0 ? originalUrl.slice(0, queryIndex) : originalUrl;
      const query = queryIndex >= 0 ? originalUrl.slice(queryIndex) : "";
      const strippedPath = path.slice(authPathPrefix.length) || "/";

      // Better Auth's node handler builds the request URL from
      // baseUrl + originalUrl (with req.url as the relative path).
      raw.baseUrl = authPathPrefix;
      raw.originalUrl = originalUrl;
      raw.url = `${strippedPath}${query}`;

      reply.hijack();
      await handler(raw, reply.raw);
    },
  );
}