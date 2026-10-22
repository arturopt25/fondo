import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

function isLocalDevDatabase(url: string): boolean {
  const parsed = new URL(url);
  const databaseName = parsed.pathname.replace(/^\//, "");
  return (
    (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") &&
    parsed.port === "5433" &&
    databaseName === "fondo"
  );
}

if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL is required to run e2e tests.");
}

if (isLocalDevDatabase(testDatabaseUrl)) {
  throw new Error(
    "Refusing to run e2e tests against the local dev database (fondo@localhost:5433).",
  );
}

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));

export default async function globalSetup(): Promise<void> {
  execSync("pnpm --filter @fondo/db db:deploy", {
    cwd: repoRoot,
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    stdio: "inherit",
  });

  // The migration creates the role with a placeholder password. Set the real
  // password for the test database so the runtime can connect as fondo_app.
  const { PrismaClient } = await import("@fondo/db");
  const adminPrisma = new PrismaClient({ datasourceUrl: testDatabaseUrl });
  const password = new URL(testDatabaseUrl).password.replace(/'/g, "''");
  await adminPrisma.$executeRawUnsafe(
    `ALTER ROLE fondo_app WITH PASSWORD '${password}'`,
  );
  await adminPrisma.$disconnect();
}
