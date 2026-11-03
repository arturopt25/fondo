import type { PrismaClient } from "@fondo/db";

export interface RuntimeDatabaseRole {
  readonly roleName: string;
  readonly isSuperuser: boolean;
  readonly bypassesRls: boolean;
}

type QueryableDatabase = Pick<PrismaClient, "$queryRaw">;

/**
 * Verify that the runtime connection uses a non-privileged PostgreSQL role.
 *
 * @param client Prisma client configured for application runtime.
 * @param nodeEnv Current application environment.
 * @param warn Warning sink used outside production.
 * @returns The inspected PostgreSQL role attributes.
 * @throws Error when the role cannot be inspected or is unsafe in production.
 */
export async function checkRuntimeDatabaseRole(
  client: QueryableDatabase,
  nodeEnv = process.env.NODE_ENV,
  warn: (message: string) => void = console.warn,
): Promise<RuntimeDatabaseRole> {
  const roles = await client.$queryRaw<RuntimeDatabaseRole[]>`
    SELECT
      current_user AS "roleName",
      rolsuper AS "isSuperuser",
      rolbypassrls AS "bypassesRls"
    FROM pg_roles
    WHERE rolname = current_user
  `;
  const role = roles[0];

  if (!role) {
    throw new Error("Unable to inspect the current PostgreSQL runtime role");
  }

  const violations: string[] = [];
  if (role.isSuperuser) {
    violations.push("superuser");
  }
  if (role.bypassesRls) {
    violations.push("BYPASSRLS");
  }

  if (violations.length === 0) {
    return role;
  }

  const message =
    `Unsafe runtime PostgreSQL role "${role.roleName}": ${violations.join(
      " and ",
    )}. ` +
    "Configure APP_DATABASE_URL with a dedicated NOSUPERUSER NOBYPASSRLS role such as fondo_app.";

  if (nodeEnv === "production") {
    throw new Error(message);
  }

  warn(message);
  return role;
}
