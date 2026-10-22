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
  throw new Error(
    "TEST_DATABASE_URL is required to run e2e tests. Point it at a dedicated database, never the local dev one.",
  );
}

if (isLocalDevDatabase(testDatabaseUrl)) {
  throw new Error(
    "Refusing to run e2e tests against the local dev database (fondo@localhost:5433). Use a dedicated TEST_DATABASE_URL.",
  );
}

process.env.DATABASE_URL = testDatabaseUrl;

// The runtime connects through the restricted application role.
// Derive it from the test owner URL, assuming the password was set to match.
const appDatabaseUrl = new URL(testDatabaseUrl);
appDatabaseUrl.username = "fondo_app";
process.env.APP_DATABASE_URL = appDatabaseUrl.toString();

process.env.BETTER_AUTH_SECRET ??=
  "e2e-secret-that-is-at-least-32-characters-long";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.WEB_ORIGIN ??= "http://localhost:5173";

// The e2e suite creates many users; relax the sign-up limit without touching
// the sign-in limit (the rate-limit e2e test relies on its default value).
process.env.AUTH_SIGNUP_RATE_LIMIT ??= "200";
process.env.API_READ_RATE_LIMIT ??= "1000";
process.env.API_WRITE_RATE_LIMIT ??= "1000";
