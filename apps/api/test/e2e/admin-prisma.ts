import { PrismaClient } from "@fondo/db";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL is required to run e2e tests.");
}

export const adminPrisma = new PrismaClient({
  datasourceUrl: testDatabaseUrl,
});
