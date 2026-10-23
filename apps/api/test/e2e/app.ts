import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { Logger } from "nestjs-pino";

import { AppModule } from "../../src/app.module.js";
import { registerBetterAuth } from "../../src/core/auth/fastify-auth.js";
import type { BetterAuthInstance } from "../../src/core/auth/better-auth.config.js";
import {
  applyHttpHardening,
  createFastifyAdapter,
} from "../../src/core/config/http-hardening.js";
import { ApiErrorFilter } from "../../src/core/errors/api-error.filter.js";
import {
  loadAppConfig,
  parseLogLevel,
  parseWebOrigins,
} from "../../src/core/config/app-config.js";
import { loadStorageConfig } from "../../src/core/storage/storage.config.js";
import { registerStorageMultipart } from "../../src/core/storage/storage.module.js";

export async function createTestApp(): Promise<NestFastifyApplication> {
  const appConfig = loadAppConfig();
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication<NestFastifyApplication>(
    createFastifyAdapter(parseLogLevel(process.env.LOG_LEVEL)),
    { bufferLogs: true },
  );
  app.useLogger(app.get(Logger));
  await registerStorageMultipart(app, loadStorageConfig(appConfig));

  app.setGlobalPrefix("api/v1");
  const webOrigins = parseWebOrigins(
    process.env.WEB_ORIGIN ?? "http://localhost:5173",
  );
  await applyHttpHardening(app, webOrigins);
  app.useGlobalFilters(app.get(ApiErrorFilter));

  const auth = app.get<BetterAuthInstance>("BETTER_AUTH");
  await registerBetterAuth(
    app.getHttpAdapter().getInstance(),
    auth,
    webOrigins,
  );

  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  return app;
}
