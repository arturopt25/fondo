export interface AppConfig {
  readonly databaseUrl: string;
  readonly appDatabaseUrl: string;
  readonly betterAuthSecret: string;
  readonly betterAuthUrl: string;
  readonly webOrigins: readonly string[];
}

const DEFAULT_WEB_ORIGIN = "http://localhost:5173";

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

export function loadAppConfig(): AppConfig {
  const databaseUrl = process.env.DATABASE_URL;
  const appDatabaseUrl = process.env.APP_DATABASE_URL;
  const betterAuthSecret = process.env.BETTER_AUTH_SECRET;
  const betterAuthUrl = process.env.BETTER_AUTH_URL;
  const webOrigins = parseWebOrigins(
    process.env.WEB_ORIGIN ?? DEFAULT_WEB_ORIGIN,
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
  };
}
