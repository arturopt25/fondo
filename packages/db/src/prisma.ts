import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  fondoPrisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const datasourceUrl =
    process.env.APP_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!datasourceUrl) {
    throw new Error(
      "Missing DATABASE_URL or APP_DATABASE_URL environment variable",
    );
  }
  return new PrismaClient({
    datasourceUrl,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

function getPrismaClient(): PrismaClient {
  const existing = globalForPrisma.fondoPrisma;
  if (existing) {
    return existing;
  }
  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.fondoPrisma = client;
  }
  return client;
}

/**
 * Lazy singleton that only constructs a PrismaClient on first use. This keeps
 * unit tests and setup files from requiring a database URL at import time, while
 * still reusing the same client across the process in development.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getPrismaClient(), prop, receiver);
  },
});
