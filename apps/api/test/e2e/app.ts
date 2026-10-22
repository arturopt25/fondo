import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";

import { AppModule } from "../../src/app.module.js";
import { registerBetterAuth } from "../../src/core/auth/fastify-auth.js";
import type { BetterAuthInstance } from "../../src/core/auth/better-auth.config.js";
import {
  applyHttpHardening,
  createFastifyAdapter,
} from "../../src/core/config/http-hardening.js";
import { ApiErrorFilter } from "../../src/core/errors/api-error.filter.js";
import { parseWebOrigins } from "../../src/core/config/app-config.js";

export async function createTestApp(): Promise<NestFastifyApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication<NestFastifyApplication>(
    createFastifyAdapter(),
  );

  app.setGlobalPrefix("api/v1");
  const webOrigins = parseWebOrigins(
    process.env.WEB_ORIGIN ?? "http://localhost:5173",
  );
  await applyHttpHardening(app, webOrigins);
  app.useGlobalFilters(new ApiErrorFilter());

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
