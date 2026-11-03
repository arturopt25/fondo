export const STORAGE_FILE_EXTENSIONS = [
  "jpg",
  "png",
  "webp",
  "pdf",
] as const;

export const STORAGE_CONFIG = Symbol("STORAGE_CONFIG");

export type StorageFileExtension = (typeof STORAGE_FILE_EXTENSIONS)[number];

export interface StorageConfig {
  readonly endpointUrl: string;
  readonly region: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly bucketName: string;
  readonly forcePathStyle: boolean;
  readonly presignExpirySeconds: number;
  readonly maxFileSizeBytes: number;
  readonly avatarMaxFileSizeBytes: number;
}

export interface UploadedFile {
  readonly buffer: Buffer;
  readonly filename: string;
  readonly mimetype: string;
}

export interface AllowedFileType {
  readonly extensions: readonly StorageFileExtension[];
  readonly mimeTypes: readonly string[];
}

export interface ValidatedFile {
  readonly contentType: string;
  readonly extension: StorageFileExtension;
  readonly originalName: string;
  readonly sizeBytes: number;
}
