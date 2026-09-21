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

export default function globalSetup(): void {
  execSync("pnpm --filter @fondo/db db:deploy", {
    cwd: repoRoot,
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    stdio: "inherit",
  });
}