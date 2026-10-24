import { BadRequestException, PayloadTooLargeException } from "@nestjs/common";
import { S3Client } from "@aws-sdk/client-s3";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StorageService } from "../../../core/storage/storage.service.js";
import type { StorageConfig } from "../../../core/storage/storage.types.js";

const config: StorageConfig = {
  endpointUrl: "http://localhost:4566",
  region: "us-east-1",
  accessKeyId: "test",
  secretAccessKey: "test",
  bucketName: "fondo-local-files",
  forcePathStyle: true,
  presignExpirySeconds: 300,
  maxFileSizeBytes: 5 * 1024 * 1024,
  avatarMaxFileSizeBytes: 2 * 1024 * 1024,
};

const avatarTypes = {
  extensions: ["jpg", "png", "webp"] as const,
  mimeTypes: ["image/jpeg", "image/png", "image/webp"],
};

const pngBuffer = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

describe("StorageService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("generates UUID keys with the detected extension", () => {
    const service = new StorageService(config);

    expect(service.generateKey("avatars/user-1", "png")).toMatch(
      /^avatars\/user-1\/[0-9a-f-]{36}\.png$/,
    );
  });

  it("sanitizes the original filename without using it as the storage key", () => {
    const service = new StorageService(config);

    expect(service.sanitizeOriginalName("../../factura ñ?.png")).toBe(
      "factura __.png",
    );
  });

  it("validates the detected file type and returns its canonical extension", async () => {
    const service = new StorageService(config);

    await expect(
      service.validateFile(
        pngBuffer,
        "avatar.png",
        "image/png",
        avatarTypes,
        config.avatarMaxFileSizeBytes,
      ),
    ).resolves.toMatchObject({
      contentType: "image/png",
      extension: "png",
      originalName: "avatar.png",
      sizeBytes: pngBuffer.length,
    });
  });

  it("rejects a file that exceeds the configured limit", async () => {
    const service = new StorageService(config);

    await expect(
      service.validateFile(
        Buffer.alloc(11),
        "avatar.png",
        "image/png",
        avatarTypes,
        10,
      ),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
  });

  it("rejects a declared MIME type that differs from magic bytes", async () => {
    const service = new StorageService(config);

    await expect(
      service.validateFile(
        pngBuffer,
        "avatar.png",
        "image/jpeg",
        avatarTypes,
        config.avatarMaxFileSizeBytes,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("treats only missing-object responses as absent", async () => {
    const service = new StorageService(config);
    const send = vi.spyOn(S3Client.prototype, "send");

    send.mockRejectedValueOnce({
      name: "NotFound",
      $metadata: { httpStatusCode: 404 },
    });
    await expect(service.exists("missing.pdf")).resolves.toBe(false);

    send.mockRejectedValueOnce(new Error("S3 is unavailable"));
    await expect(service.exists("unknown.pdf")).rejects.toThrow(
      "S3 is unavailable",
    );
  });

  it("returns a signed URL only when the object exists", async () => {
    const service = new StorageService(config);
    const exists = vi.spyOn(service, "exists");

    exists.mockResolvedValueOnce(false);
    await expect(
      service.getSignedDownloadUrlOrNull("missing.pdf"),
    ).resolves.toBeNull();

    exists.mockResolvedValueOnce(true);
    await expect(
      service.getSignedDownloadUrlOrNull("invoice.pdf"),
    ).resolves.toMatch(/^http:\/\/localhost:4566\//);
  });
});
