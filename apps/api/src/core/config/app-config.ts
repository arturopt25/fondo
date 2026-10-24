export interface AppConfig {
  readonly databaseUrl: string;
  readonly appDatabaseUrl: string;
  readonly betterAuthSecret: string;
  readonly betterAuthUrl: string;
  readonly webOrigins: readonly string[];
  readonly logLevel: LogLevel;
  readonly awsEndpointUrl: string;
  readonly awsRegion: string;
  readonly awsAccessKeyId: string;
  readonly awsSecretAccessKey: string;
  readonly s3BucketName: string;
  readonly s3ForcePathStyle: boolean;
  readonly s3PresignExpirySeconds: number;
  readonly s3MaxFileSizeBytes: number;
  readonly s3AvatarMaxFileSizeBytes: number;
}

const DEFAULT_WEB_ORIGIN = "http://localhost:5173";
const DEFAULT_LOG_LEVEL: LogLevel = "info";
const DEFAULT_AWS_ENDPOINT_URL = "http://localhost:4566";
const DEFAULT_AWS_REGION = "us-east-1";
const DEFAULT_AWS_ACCESS_KEY_ID = "test";
const DEFAULT_AWS_SECRET_ACCESS_KEY = "test";
const DEFAULT_S3_BUCKET_NAME = "fondo-local-files";
const DEFAULT_S3_FORCE_PATH_STYLE = true;
const DEFAULT_S3_PRESIGN_EXPIRY_SECONDS = 300;
const DEFAULT_S3_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const DEFAULT_S3_AVATAR_MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
const LOG_LEVELS = [
  "trace",
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
  "silent",
] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

export function parseLogLevel(raw: string | undefined): LogLevel {
  const level = raw ?? DEFAULT_LOG_LEVEL;

  if (!LOG_LEVELS.includes(level as LogLevel)) {
    throw new Error(
      `LOG_LEVEL must be one of: ${LOG_LEVELS.join(", ")}; received ${level}`,
    );
  }

  return level as LogLevel;
}

export function parseWebOrigins(raw: string): readonly string[] {
  const origins = raw
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  if (origins.length === 0) {
    throw new Error("WEB_ORIGIN must contain at least one origin");
  }

  const uniqueOrigins = [...new Set(origins)];

  for (const origin of uniqueOrigins) {
    if (origin.includes("*")) {
      throw new Error(`WEB_ORIGIN must not contain a wildcard: ${origin}`);
    }

    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(`WEB_ORIGIN contains an invalid URL: ${origin}`);
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(`WEB_ORIGIN must use HTTP or HTTPS: ${origin}`);
    }

    if (
      origin.endsWith("/") ||
      parsed.pathname !== "/" ||
      parsed.search !== "" ||
      parsed.hash !== "" ||
      parsed.username !== "" ||
      parsed.password !== ""
    ) {
      throw new Error(`WEB_ORIGIN must be a scheme and host only: ${origin}`);
    }
  }

  return uniqueOrigins;
}

function parsePositiveInteger(
  raw: string | undefined,
  fallback: number,
  name: string,
): number {
  const value = Number(raw ?? fallback);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer; received ${raw}`);
  }

  return value;
}

function parseBoolean(
  raw: string | undefined,
  fallback: boolean,
  name: string,
): boolean {
  if (raw === undefined) {
    return fallback;
  }

  if (raw === "true") {
    return true;
  }

  if (raw === "false") {
    return false;
  }

  throw new Error(`${name} must be true or false; received ${raw}`);
}

export function loadAppConfig(): AppConfig {
  const databaseUrl = process.env.DATABASE_URL;
  const appDatabaseUrl = process.env.APP_DATABASE_URL;
  const betterAuthSecret = process.env.BETTER_AUTH_SECRET;
  const betterAuthUrl = process.env.BETTER_AUTH_URL;
  const webOrigins = parseWebOrigins(
    process.env.WEB_ORIGIN ?? DEFAULT_WEB_ORIGIN,
  );
  const logLevel = parseLogLevel(process.env.LOG_LEVEL);
  const awsEndpointUrl =
    process.env.AWS_ENDPOINT_URL ?? DEFAULT_AWS_ENDPOINT_URL;
  const awsRegion = process.env.AWS_REGION ?? DEFAULT_AWS_REGION;
  const awsAccessKeyId =
    process.env.AWS_ACCESS_KEY_ID ?? DEFAULT_AWS_ACCESS_KEY_ID;
  const awsSecretAccessKey =
    process.env.AWS_SECRET_ACCESS_KEY ?? DEFAULT_AWS_SECRET_ACCESS_KEY;
  const s3BucketName =
    process.env.S3_BUCKET_NAME ?? DEFAULT_S3_BUCKET_NAME;
  const s3ForcePathStyle = parseBoolean(
    process.env.S3_FORCE_PATH_STYLE,
    DEFAULT_S3_FORCE_PATH_STYLE,
    "S3_FORCE_PATH_STYLE",
  );
  const s3PresignExpirySeconds = parsePositiveInteger(
    process.env.S3_PRESIGN_EXPIRY_SECONDS,
    DEFAULT_S3_PRESIGN_EXPIRY_SECONDS,
    "S3_PRESIGN_EXPIRY_SECONDS",
  );
  const s3MaxFileSizeBytes = parsePositiveInteger(
    process.env.S3_MAX_FILE_SIZE_BYTES,
    DEFAULT_S3_MAX_FILE_SIZE_BYTES,
    "S3_MAX_FILE_SIZE_BYTES",
  );
  const s3AvatarMaxFileSizeBytes = parsePositiveInteger(
    process.env.S3_AVATAR_MAX_FILE_SIZE_BYTES,
    DEFAULT_S3_AVATAR_MAX_FILE_SIZE_BYTES,
    "S3_AVATAR_MAX_FILE_SIZE_BYTES",
  );

  const missing: string[] = [];

  if (!databaseUrl) {
    missing.push("DATABASE_URL");
  }
  if (!appDatabaseUrl) {
    missing.push("APP_DATABASE_URL");
  }
  if (!betterAuthSecret) {
    missing.push("BETTER_AUTH_SECRET");
  }
  if (!betterAuthUrl) {
    missing.push("BETTER_AUTH_URL");
  }
  if (betterAuthSecret && betterAuthSecret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must be at least 32 characters long");
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  return {
    databaseUrl: databaseUrl as string,
    appDatabaseUrl: appDatabaseUrl as string,
    betterAuthSecret: betterAuthSecret as string,
    betterAuthUrl: betterAuthUrl as string,
    webOrigins,
    logLevel,
    awsEndpointUrl,
    awsRegion,
    awsAccessKeyId,
    awsSecretAccessKey,
    s3BucketName,
    s3ForcePathStyle,
    s3PresignExpirySeconds,
    s3MaxFileSizeBytes,
    s3AvatarMaxFileSizeBytes,
  };
}
