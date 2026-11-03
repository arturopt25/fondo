import { BadRequestException, PayloadTooLargeException } from "@nestjs/common";
import { fileTypeFromBuffer } from "file-type";
import { basename } from "node:path";
import { randomUUID } from "node:crypto";

import type {
  AllowedFileType,
  StorageFileExtension,
  ValidatedFile,
} from "../../src/core/storage/storage.types.js";

export class FakeStorageService {
  readonly maxFileSizeBytes = 5 * 1024 * 1024;
  readonly avatarMaxFileSizeBytes = 2 * 1024 * 1024;
  readonly objects = new Map<string, { body: Buffer; contentType: string }>();
  failDeletes = false;

  async validateFile(
    buffer: Buffer,
    filename: string,
    declaredContentType: string,
    allowed: AllowedFileType,
    maxSizeBytes: number,
  ): Promise<ValidatedFile> {
    if (buffer.length > maxSizeBytes) {
      throw new PayloadTooLargeException("File exceeds the maximum allowed size");
    }

    const detected = await fileTypeFromBuffer(buffer);
    const extension = detected?.ext === "jpeg" ? "jpg" : detected?.ext;
    if (
      !detected ||
      !isStorageFileExtension(extension) ||
      !allowed.extensions.includes(extension) ||
      !allowed.mimeTypes.includes(detected.mime) ||
      detected.mime !== declaredContentType
    ) {
      throw new BadRequestException("File type is not allowed");
    }

    return {
      contentType: detected.mime,
      extension,
      originalName: this.sanitizeOriginalName(filename),
      sizeBytes: buffer.length,
    };
  }

  generateKey(prefix: string, extension: StorageFileExtension): string {
    return `${prefix}/${randomUUID()}.${extension}`;
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<void> {
    this.objects.set(key, { body, contentType });
  }

  async delete(key: string): Promise<void> {
    if (this.failDeletes) {
      throw new Error("fake storage delete failed");
    }
    this.objects.delete(key);
  }

  async getSignedDownloadUrl(key: string): Promise<string> {
    return `https://fake-storage.local/${encodeURIComponent(key)}`;
  }

  async exists(key: string): Promise<boolean> {
    return this.objects.has(key);
  }

  async getSignedDownloadUrlOrNull(key: string): Promise<string | null> {
    if (!(await this.exists(key))) {
      return null;
    }

    return this.getSignedDownloadUrl(key);
  }

  sanitizeOriginalName(filename: string): string {
    return basename(filename)
      .replace(/[^a-zA-Z0-9._ -]/g, "_")
      .trim()
      .slice(0, 255);
  }

  clear(): void {
    this.objects.clear();
  }
}

function isStorageFileExtension(
  extension: string | undefined,
): extension is StorageFileExtension {
  return (
    extension === "jpg" ||
    extension === "png" ||
    extension === "webp" ||
    extension === "pdf"
  );
}
