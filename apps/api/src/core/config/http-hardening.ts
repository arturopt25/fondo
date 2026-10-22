import helmet from "@fastify/helmet";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { FastifyAdapter } from "@nestjs/platform-fastify";

const BODY_LIMIT_BYTES = 1_048_576;

export function createFastifyAdapter(): FastifyAdapter {
  return new FastifyAdapter({ bodyLimit: BODY_LIMIT_BYTES });
}

export async function applyHttpHardening(
  app: NestFastifyApplication,
  webOrigins: readonly string[],
): Promise<void> {
  app.enableCors({
    credentials: true,
    origin: [...webOrigins],
  });
  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });
}
