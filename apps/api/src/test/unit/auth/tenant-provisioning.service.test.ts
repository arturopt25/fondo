import { Prisma } from "@fondo/db";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TenantProvisioningService } from "../../../core/auth/tenant-provisioning.service.js";

function createMockPrisma() {
  const tenantFindFirst = vi.fn();
  const tenantCreate = vi.fn();
  const membershipCreate = vi.fn();
  const membershipFindFirst = vi.fn();
  const userSettingsCreate = vi.fn();
  const serviceDefinitionFindUnique = vi.fn();
  const serviceSubscriptionCreate = vi.fn();
  const categoryCreateMany = vi.fn();

  const tx = {
    tenant: { create: tenantCreate },
    membership: { findFirst: membershipFindFirst, create: membershipCreate },
    userSettings: { create: userSettingsCreate },
    serviceDefinition: { findUnique: serviceDefinitionFindUnique },
    serviceSubscription: { create: serviceSubscriptionCreate },
    category: { createMany: categoryCreateMany },
  };

  const withUserContext = vi.fn(
    async (_userId: string, fn: (inner: typeof tx) => Promise<unknown>) =>
      fn(tx),
  );
  const withTenantContext = vi.fn(
    async (_ctx: unknown, fn: (inner: typeof tx) => Promise<unknown>) => fn(tx),
  );

  const prisma = {
    client: {
      tenant: { findFirst: tenantFindFirst },
      membership: { findFirst: membershipFindFirst },
    },
    withUserContext,
    withTenantContext,
  };

  return {
    prisma,
    fns: {
      tenantFindFirst,
      membershipFindFirst,
      withUserContext,
      withTenantContext,
      tenantCreate,
      membershipCreate,
      userSettingsCreate,
      serviceDefinitionFindUnique,
      serviceSubscriptionCreate,
      categoryCreateMany,
    },
  };
}

describe("TenantProvisioningService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates tenant, ADMIN membership, settings and the default service atomically", async () => {
    const { prisma, fns } = createMockPrisma();
    fns.tenantFindFirst.mockResolvedValue(null);
    fns.tenantCreate.mockResolvedValue({ id: "tenant-1" });
    fns.serviceDefinitionFindUnique.mockResolvedValue({
      id: "svc-1",
      capabilities: [
        {
          id: "cap-accounts",
          required: true,
          defaultEnabled: true,
        },
        {
          id: "cap-budgets",
          required: false,
          defaultEnabled: true,
        },
        {
          id: "cap-recurring",
          required: false,
          defaultEnabled: false,
        },
      ],
    });
    const service = new TenantProvisioningService(prisma as never);

    await service.provisionForUser("user-1", "Arturo");

    expect(fns.tenantCreate).toHaveBeenCalledWith({
      data: {
        id: expect.any(String),
        name: "Arturo's space",
        slug: expect.stringContaining("arturo-user-1"),
        ownerUserId: "user-1",
      },
    });
    expect(fns.membershipCreate).toHaveBeenCalledWith({
      data: { tenantId: expect.any(String), userId: "user-1", role: "ADMIN" },
    });
    expect(fns.userSettingsCreate).toHaveBeenCalledWith({
      data: { userId: "user-1" },
    });
    expect(fns.serviceDefinitionFindUnique).toHaveBeenCalledWith({
      where: { key: "PERSONAL_FINANCE" },
      include: { capabilities: true },
    });
    expect(fns.serviceSubscriptionCreate).toHaveBeenCalledWith({
      data: {
        tenantId: expect.any(String),
        serviceId: "svc-1",
        status: "ACTIVE",
        selections: {
          create: [
            { capabilityId: "cap-accounts", enabled: true },
            { capabilityId: "cap-budgets", enabled: true },
          ],
        },
      },
    });
    expect(fns.categoryCreateMany).toHaveBeenCalledWith({
      data: [
        {
          tenantId: expect.any(String),
          name: "Housing",
          type: "EXPENSE",
          isDefault: true,
        },
        {
          tenantId: expect.any(String),
          name: "Food",
          type: "EXPENSE",
          isDefault: true,
        },
        {
          tenantId: expect.any(String),
          name: "Transport",
          type: "EXPENSE",
          isDefault: true,
        },
        {
          tenantId: expect.any(String),
          name: "Leisure",
          type: "EXPENSE",
          isDefault: true,
        },
        {
          tenantId: expect.any(String),
          name: "Other",
          type: "EXPENSE",
          isDefault: true,
        },
        {
          tenantId: expect.any(String),
          name: "Income",
          type: "INCOME",
          isDefault: true,
        },
      ],
    });
    expect(fns.withTenantContext).toHaveBeenCalledTimes(1);
  });

  it("is idempotent when the tenant already exists", async () => {
    const { prisma, fns } = createMockPrisma();
    fns.membershipFindFirst.mockResolvedValue({ id: "membership-1" });
    const service = new TenantProvisioningService(prisma as never);

    await service.provisionForUser("user-1", "Arturo");

    expect(fns.withTenantContext).not.toHaveBeenCalled();
  });

  it("recovers when a concurrent duplicate tenant wins the race", async () => {
    const { prisma, fns } = createMockPrisma();
    fns.membershipFindFirst.mockResolvedValue(null);
    fns.tenantCreate.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("unique", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    const service = new TenantProvisioningService(prisma as never);

    await expect(
      service.provisionForUser("user-1", "Arturo"),
    ).resolves.toBeUndefined();
    expect(fns.withTenantContext).toHaveBeenCalledTimes(1);
  });

  it("rethrows unexpected provisioning errors", async () => {
    const { prisma, fns } = createMockPrisma();
    fns.membershipFindFirst.mockResolvedValue(null);
    fns.tenantCreate.mockRejectedValue(new Error("db down"));
    const service = new TenantProvisioningService(prisma as never);

    await expect(service.provisionForUser("user-1", "Arturo")).rejects.toThrow(
      "db down",
    );
  });
});
