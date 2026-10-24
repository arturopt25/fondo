import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Logger } from "nestjs-pino";

import { AppModule } from "./app.module.js";
import { registerBetterAuth } from "./core/auth/fastify-auth.js";
import type { BetterAuthInstance } from "./core/auth/better-auth.config.js";
import { loadAppConfig } from "./core/config/app-config.js";
import {
  applyHttpHardening,
  createFastifyAdapter,
} from "./core/config/http-hardening.js";
import { ApiErrorFilter } from "./core/errors/api-error.filter.js";
import { loadStorageConfig } from "./core/storage/storage.config.js";
import { registerStorageMultipart } from "./core/storage/storage.module.js";

async function bootstrap(): Promise<void> {
  const config = loadAppConfig();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    createFastifyAdapter(config.logLevel),
    { bufferLogs: true },
  );
  app.useLogger(app.get(Logger));
  await registerStorageMultipart(app, loadStorageConfig(config));

  app.setGlobalPrefix("api/v1");
  await applyHttpHardening(app, config.webOrigins);
  app.useGlobalFilters(app.get(ApiErrorFilter));

  const auth = app.get<BetterAuthInstance>("BETTER_AUTH");
  await registerBetterAuth(
    app.getHttpAdapter().getInstance(),
    auth,
    config.webOrigins,
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Fondo API")
    .setDescription("Personal Finance Services Platform API")
    .setVersion("1.0")
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/v1/docs", app, document);

  await app.listen(Number(process.env.PORT ?? 3000), "0.0.0.0");
}

void bootstrap();
