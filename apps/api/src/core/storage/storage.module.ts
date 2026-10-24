import multipart from "@fastify/multipart";
import { Global, Module } from "@nestjs/common";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";

import { loadStorageConfig } from "./storage.config.js";
import { StorageService } from "./storage.service.js";
import { STORAGE_CONFIG, type StorageConfig } from "./storage.types.js";

export async function registerStorageMultipart(
  app: NestFastifyApplication,
  config: StorageConfig,
): Promise<void> {
  await app.getHttpAdapter().getInstance().register(multipart, {
    throwFileSizeLimit: true,
    limits: {
      fileSize: config.maxFileSizeBytes,
      files: 5,
    },
  });
}

@Global()
@Module({
  providers: [
    { provide: STORAGE_CONFIG, useFactory: loadStorageConfig },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}
