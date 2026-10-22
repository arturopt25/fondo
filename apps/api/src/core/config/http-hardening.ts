import helmet from "@fastify/helmet";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { FastifyAdapter } from "@nestjs/platform-fastify";

import type { LogLevel } from "./app-config.js";
import {
  createFastifyLoggerOptions,
  generateRequestIdFromRequest,
} from "../logger/logger.config.js";

const BODY_LIMIT_BYTES = 1_048_576;

export function createFastifyAdapter(logLevel: LogLevel): FastifyAdapter {
  return new FastifyAdapter({
    bodyLimit: BODY_LIMIT_BYTES,
    logger: createFastifyLoggerOptions(logLevel),
    requestIdHeader: false,
    genReqId: generateRequestIdFromRequest,
  });
}

export async function applyHttpHardening(
  app: NestFastifyApplication,
  webOrigins: readonly string[],
): Promise<void> {
  app.enableCors({
    credentials: true,
    origin: [...webOrigins],
  });
  app.getHttpAdapter().getInstance().addHook("onRequest", async (request, reply) => {
    reply.header("X-Request-Id", request.id);
  });
  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });
}
