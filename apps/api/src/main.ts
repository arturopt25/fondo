import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "./app.module.js";
import { registerBetterAuth } from "./core/auth/fastify-auth.js";
import type { BetterAuthInstance } from "./core/auth/better-auth.config.js";
import { loadAppConfig } from "./core/config/app-config.js";
import { ApiErrorFilter } from "./core/errors/api-error.filter.js";

async function bootstrap(): Promise<void> {
  loadAppConfig();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  app.setGlobalPrefix("api/v1");
  app.enableCors({
    credentials: true,
    origin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
  });
  app.useGlobalFilters(new ApiErrorFilter());

  const auth = app.get<BetterAuthInstance>("BETTER_AUTH");
  await registerBetterAuth(app.getHttpAdapter().getInstance(), auth);

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
