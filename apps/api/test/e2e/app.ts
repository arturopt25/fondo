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

export async function createTestApp(): Promise<NestFastifyApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication<NestFastifyApplication>(
    createFastifyAdapter(),
  );

  app.setGlobalPrefix("api/v1");
  await applyHttpHardening(app);
  app.useGlobalFilters(new ApiErrorFilter());

  const auth = app.get<BetterAuthInstance>("BETTER_AUTH");
  await registerBetterAuth(app.getHttpAdapter().getInstance(), auth);

  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  return app;
}