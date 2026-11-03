import { randomUUID } from "node:crypto";

import { PrismaClient } from "@fondo/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { adminPrisma } from "./admin-prisma.js";

const appDatabaseUrl = process.env.APP_DATABASE_URL;

if (!appDatabaseUrl) {
  throw new Error("APP_DATABASE_URL is required for the RLS isolation test.");
}

const appPrisma = new PrismaClient({ datasourceUrl: appDatabaseUrl });

interface TenantFixture {
  readonly id: string;
  readonly userId: string;
}

let tenantA: TenantFixture;
let tenantB: TenantFixture;

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function createTenantFixture(label: string): Promise<TenantFixture> {
  const suffix = uniqueSuffix();
  const user = await adminPrisma.user.create({
    data: {
      id: randomUUID(),
      name: `${label} User`,
      email: `rls-${label}-${suffix}@example.com`,
    },
  });
  const tenant = await adminPrisma.tenant.create({
    data: {
      name: `${label} Tenant`,
      slug: `rls-${label}-${suffix}`,
      ownerUserId: user.id,
    },
  });

  return { id: tenant.id, userId: user.id };
}

async function seedCategory(
  tenantId: string,
  name: string,
): Promise<void> {
  await adminPrisma.category.create({
    data: { tenantId, name, type: "EXPENSE" },
  });
}

beforeAll(async () => {
  tenantA = await createTenantFixture("a");
  tenantB = await createTenantFixture("b");
  await seedCategory(tenantA.id, `A category ${uniqueSuffix()}`);
  await seedCategory(tenantB.id, `B category ${uniqueSuffix()}`);
});

afterAll(async () => {
  const tenantIds = [tenantA.id, tenantB.id];
  const userIds = [tenantA.userId, tenantB.userId];

  await adminPrisma.category.deleteMany({
    where: { tenantId: { in: tenantIds } },
  });
  await adminPrisma.tenant.deleteMany({ where: { id: { in: tenantIds } } });
  await adminPrisma.user.deleteMany({ where: { id: { in: userIds } } });

  await appPrisma.$disconnect();
  await adminPrisma.$disconnect();
});

describe("RLS tenant isolation with the fondo_app role", () => {
  it("hides all tenant rows when app.tenant_id is not set", async () => {
    const tenants = await appPrisma.tenant.findMany({ select: { id: true } });
    const categories = await appPrisma.category.findMany({
      select: { id: true },
    });

    expect(tenants).toHaveLength(0);
    expect(categories).toHaveLength(0);
  });

  it("only exposes rows for the active tenant context", async () => {
    const tenants = await appPrisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantA.id}, true)`;
      return tx.tenant.findMany({ select: { id: true } });
    });

    expect(tenants.map((row) => row.id)).toEqual([tenantA.id]);
  });

  it("rejects inserts that target another tenant", async () => {
    await expect(
      appPrisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantA.id}, true)`;
        await tx.category.create({
          data: {
            tenantId: tenantB.id,
            name: `cross-tenant-${uniqueSuffix()}`,
            type: "EXPENSE",
          },
        });
      }),
    ).rejects.toThrow(/row-level security|policy/i);
  });
});
