import type { PrismaClient } from "@fondo/db";
import { describe, expect, it, vi } from "vitest";

import { checkRuntimeDatabaseRole } from "../../../core/config/runtime-database-role.js";

function createClient(role: {
  readonly roleName: string;
  readonly isSuperuser: boolean;
  readonly bypassesRls: boolean;
}) {
  return {
    $queryRaw: vi.fn().mockResolvedValue([role]),
  } as unknown as Pick<PrismaClient, "$queryRaw">;
}

describe("checkRuntimeDatabaseRole", () => {
  it("accepts a non-superuser role that cannot bypass RLS", async () => {
    const client = createClient({
      roleName: "fondo_app",
      isSuperuser: false,
      bypassesRls: false,
    });

    await expect(
      checkRuntimeDatabaseRole(client, "production"),
    ).resolves.toEqual({
      roleName: "fondo_app",
      isSuperuser: false,
      bypassesRls: false,
    });
  });

  it("warns outside production for a privileged role", async () => {
    const client = createClient({
      roleName: "fondo",
      isSuperuser: false,
      bypassesRls: true,
    });
    const warn = vi.fn();

    await expect(
      checkRuntimeDatabaseRole(client, "development", warn),
    ).resolves.toMatchObject({ roleName: "fondo" });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("BYPASSRLS"));
  });

  it("fails production startup for a privileged role", async () => {
    const client = createClient({
      roleName: "neondb_owner",
      isSuperuser: false,
      bypassesRls: true,
    });

    await expect(
      checkRuntimeDatabaseRole(client, "production"),
    ).rejects.toThrow(/neondb_owner.*BYPASSRLS/);
  });

  it("fails when PostgreSQL does not return the current role", async () => {
    const client = {
      $queryRaw: vi.fn().mockResolvedValue([]),
    } as unknown as Pick<PrismaClient, "$queryRaw">;

    await expect(
      checkRuntimeDatabaseRole(client, "test"),
    ).rejects.toThrow("Unable to inspect the current PostgreSQL runtime role");
  });
});
