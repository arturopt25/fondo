export interface AppConfig {
  readonly databaseUrl: string;
  readonly betterAuthSecret: string;
  readonly betterAuthUrl: string;
  readonly webOrigin: string;
}

export function loadAppConfig(): AppConfig {
  const databaseUrl = process.env.DATABASE_URL;
  const betterAuthSecret = process.env.BETTER_AUTH_SECRET;
  const betterAuthUrl = process.env.BETTER_AUTH_URL;
  const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:5173";

  const missing: string[] = [];

  if (!databaseUrl) {
    missing.push("DATABASE_URL");
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
    betterAuthSecret: betterAuthSecret as string,
    betterAuthUrl: betterAuthUrl as string,
    webOrigin,
  };
}
