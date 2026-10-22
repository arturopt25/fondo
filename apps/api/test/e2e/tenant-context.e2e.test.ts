import { afterAll, describe, expect, it } from "vitest";

import { PrismaService } from "../../src/core/prisma.service.js";

const prisma = new PrismaService();

interface TransactionSettings {
  readonly tenantId: string | null;
  readonly userId: string | null;
}

describe("tenant transaction context", () => {
  afterAll(async () => {
    await prisma.client.$disconnect();
  });

  it("sets local context for the transaction and restores it after rollback", async () => {
    const insideTransaction = await prisma.withTenantContext(
      { tenantId: "tenant-context-test", userId: "user-context-test" },
      async (tx) => {
        const [settings] = await tx.$queryRaw<TransactionSettings[]>`
          SELECT
            current_setting('app.tenant_id', true) AS "tenantId",
            current_setting('app.user_id', true) AS "userId"
        `;
        return settings;
      },
    );

    expect(insideTransaction).toEqual({
      tenantId: "tenant-context-test",
      userId: "user-context-test",
    });

    await expect(
      prisma.withTenantContext(
        { tenantId: "rolled-back-tenant", userId: "rolled-back-user" },
        async () => {
          throw new Error("rollback context");
        },
      ),
    ).rejects.toThrow("rollback context");

    const [afterRollback] = await prisma.client.$queryRaw<
      TransactionSettings[]
    >`
      SELECT
        current_setting('app.tenant_id', true) AS "tenantId",
        current_setting('app.user_id', true) AS "userId"
    `;

    expect(afterRollback).toEqual({ tenantId: "", userId: "" });
  });
});
