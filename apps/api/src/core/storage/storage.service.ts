import {
  BadRequestException,
  Inject,
  Injectable,
  PayloadTooLargeException,
} from "@nestjs/common";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { fileTypeFromBuffer } from "file-type";
import { extname, basename } from "node:path";
import { randomUUID } from "node:crypto";

import {
  STORAGE_FILE_EXTENSIONS,
  type AllowedFileType,
  STORAGE_CONFIG,
  type StorageConfig,
  type StorageFileExtension,
  type ValidatedFile,
} from "./storage.types.js";

const MIME_EXTENSION_ALIASES: Readonly<Record<string, StorageFileExtension>> = {
  jpeg: "jpg",
};

@Injectable()
export class StorageService {
  private readonly client: S3Client;

  constructor(@Inject(STORAGE_CONFIG) private readonly config: StorageConfig) {
    this.client = new S3Client({
      endpoint: config.endpointUrl,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: config.forcePathStyle,
    });
  }

  async upload(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
        Body: body,
        ContentLength: body.length,
        ContentType: contentType,
      }),
    );
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
      }),
    );
  }

  async getSignedDownloadUrl(
    key: string,
    expiresInSeconds = this.config.presignExpirySeconds,
  ): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
      }),
      { expiresIn: expiresInSeconds },
    );
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.config.bucketName,
          Key: key,
        }),
      );
      return true;
    } catch (error) {
      if (isMissingObjectError(error)) {
        return false;
      }

      throw error;
    }
  }

  async getSignedDownloadUrlOrNull(key: string): Promise<string | null> {
    if (!(await this.exists(key))) {
      return null;
    }

    return this.getSignedDownloadUrl(key);
  }

  validateFile(
    buffer: Buffer,
    filename: string,
    declaredContentType: string,
    allowed: AllowedFileType,
    maxSizeBytes: number,
  ): Promise<ValidatedFile> {
    return this.validateFileContent(
      buffer,
      filename,
      declaredContentType,
      allowed,
      maxSizeBytes,
    );
  }

  generateKey(prefix: string, extension: StorageFileExtension): string {
    if (!STORAGE_FILE_EXTENSIONS.includes(extension)) {
      throw new BadRequestException("Unsupported storage file extension");
    }

    return `${prefix}/${randomUUID()}.${extension}`;
  }

  sanitizeOriginalName(filename: string): string {
    const safeName = basename(filename)
      .replace(/[^a-zA-Z0-9._ -]/g, "_")
      .trim();

    return safeName.slice(0, 255) || "file";
  }

  get maxFileSizeBytes(): number {
    return this.config.maxFileSizeBytes;
  }

  get avatarMaxFileSizeBytes(): number {
    return this.config.avatarMaxFileSizeBytes;
  }

  private async validateFileContent(
    buffer: Buffer,
    filename: string,
    declaredContentType: string,
    allowed: AllowedFileType,
    maxSizeBytes: number,
  ): Promise<ValidatedFile> {
    if (buffer.length > maxSizeBytes) {
      throw new PayloadTooLargeException(
        `File exceeds the maximum allowed size of ${maxSizeBytes} bytes`,
      );
    }

    const detected = await fileTypeFromBuffer(buffer);
    if (!detected) {
      throw new BadRequestException("File type could not be detected");
    }

    const detectedExtension = this.normalizeDetectedExtension(detected.ext);
    const declaredMimeType = declaredContentType.split(";", 1)[0]?.trim();
    const originalExtension = this.normalizeOriginalExtension(filename);

    if (
      !allowed.extensions.includes(detectedExtension) ||
      !allowed.mimeTypes.includes(detected.mime)
    ) {
      throw new BadRequestException("File type is not allowed");
    }

    if (declaredMimeType !== detected.mime) {
      throw new BadRequestException("Declared MIME type does not match the file");
    }

    if (!this.isCompatibleOriginalExtension(originalExtension, detectedExtension)) {
      throw new BadRequestException("File extension does not match the file content");
    }

    return {
      contentType: detected.mime,
      extension: detectedExtension,
      originalName: this.sanitizeOriginalName(filename),
      sizeBytes: buffer.length,
    };
  }

  private normalizeDetectedExtension(extension: string): StorageFileExtension {
    const normalized = MIME_EXTENSION_ALIASES[extension] ?? extension;

    if (!STORAGE_FILE_EXTENSIONS.includes(normalized as StorageFileExtension)) {
      throw new BadRequestException("File type is not supported");
    }

    return normalized as StorageFileExtension;
  }

  private normalizeOriginalExtension(filename: string): string {
    return extname(filename).slice(1).toLowerCase();
  }

  private isCompatibleOriginalExtension(
    originalExtension: string,
    detectedExtension: StorageFileExtension,
  ): boolean {
    if (detectedExtension === "jpg") {
      return originalExtension === "jpg" || originalExtension === "jpeg";
    }

    return originalExtension === detectedExtension;
  }
}

function isMissingObjectError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    readonly name?: string;
    readonly Code?: string;
    readonly $metadata?: { readonly httpStatusCode?: number };
  };

  return (
    candidate.$metadata?.httpStatusCode === 404 ||
    candidate.name === "NotFound" ||
    candidate.name === "NoSuchKey" ||
    candidate.Code === "NotFound" ||
    candidate.Code === "NoSuchKey"
  );
}
