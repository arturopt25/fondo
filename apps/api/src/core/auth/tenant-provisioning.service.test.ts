import { Prisma } from "@fondo/db";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TenantProvisioningService } from "./tenant-provisioning.service.js";

function createMockPrisma() {
  const tenantFindFirst = vi.fn();
  const transaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
    fn({}),
  );
  const tenantCreate = vi.fn();
  const membershipCreate = vi.fn();
  const userSettingsCreate = vi.fn();
  const serviceDefinitionFindUnique = vi.fn();
  const serviceSubscriptionCreate = vi.fn();
  const categoryCreateMany = vi.fn();

  const tx = {
    tenant: { create: tenantCreate },
    membership: { create: membershipCreate },
    userSettings: { create: userSettingsCreate },
    serviceDefinition: { findUnique: serviceDefinitionFindUnique },
    serviceSubscription: { create: serviceSubscriptionCreate },
    category: { createMany: categoryCreateMany },
  };

  transaction.mockImplementation(
    async (fn: (inner: typeof tx) => Promise<unknown>) => fn(tx),
  );

  return {
    client: {
      tenant: { findFirst: tenantFindFirst },
      $transaction: transaction,
    },
    fns: {
      tenantFindFirst,
      transaction,
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
    const { client, fns } = createMockPrisma();
    fns.tenantFindFirst.mockResolvedValue(null);
    fns.tenantCreate.mockResolvedValue({ id: "tenant-1" });
    fns.serviceDefinitionFindUnique.mockResolvedValue({ id: "svc-1" });
    const service = new TenantProvisioningService({ client } as never);

    await service.provisionForUser("user-1", "Arturo");

    expect(fns.tenantCreate).toHaveBeenCalledWith({
      data: {
        name: "Arturo's space",
        slug: expect.stringContaining("arturo-user-1"),
        ownerUserId: "user-1",
      },
    });
    expect(fns.membershipCreate).toHaveBeenCalledWith({
      data: { tenantId: "tenant-1", userId: "user-1", role: "ADMIN" },
    });
    expect(fns.userSettingsCreate).toHaveBeenCalledWith({
      data: { userId: "user-1" },
    });
    expect(fns.serviceDefinitionFindUnique).toHaveBeenCalledWith({
      where: { key: "PERSONAL_FINANCE" },
    });
    expect(fns.serviceSubscriptionCreate).toHaveBeenCalledWith({
      data: {
        tenantId: "tenant-1",
        serviceId: "svc-1",
        status: "ACTIVE",
      },
    });
    expect(fns.categoryCreateMany).toHaveBeenCalledWith({
      data: [
        { tenantId: "tenant-1", name: "Housing", type: "EXPENSE", isDefault: true },
        { tenantId: "tenant-1", name: "Food", type: "EXPENSE", isDefault: true },
        { tenantId: "tenant-1", name: "Transport", type: "EXPENSE", isDefault: true },
        { tenantId: "tenant-1", name: "Leisure", type: "EXPENSE", isDefault: true },
        { tenantId: "tenant-1", name: "Other", type: "EXPENSE", isDefault: true },
        { tenantId: "tenant-1", name: "Income", type: "INCOME", isDefault: true },
      ],
    });
    expect(fns.transaction).toHaveBeenCalledTimes(1);
  });

  it("is idempotent when the tenant already exists", async () => {
    const { client, fns } = createMockPrisma();
    fns.tenantFindFirst.mockResolvedValue({ id: "tenant-1" });
    const service = new TenantProvisioningService({ client } as never);

    await service.provisionForUser("user-1", "Arturo");

    expect(fns.transaction).not.toHaveBeenCalled();
  });

  it("recovers when a concurrent duplicate tenant wins the race", async () => {
    const { client, fns } = createMockPrisma();
    fns.tenantFindFirst.mockResolvedValueOnce(null);
    fns.tenantCreate.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("unique", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    fns.tenantFindFirst.mockResolvedValueOnce({ id: "tenant-1" });
    const service = new TenantProvisioningService({ client } as never);

    await expect(
      service.provisionForUser("user-1", "Arturo"),
    ).resolves.toBeUndefined();
    expect(fns.tenantFindFirst).toHaveBeenCalledTimes(2);
  });

  it("rethrows unexpected provisioning errors", async () => {
    const { client, fns } = createMockPrisma();
    fns.tenantFindFirst.mockResolvedValue(null);
    fns.tenantCreate.mockRejectedValue(new Error("db down"));
    const service = new TenantProvisioningService({ client } as never);

    await expect(service.provisionForUser("user-1", "Arturo")).rejects.toThrow(
      "db down",
    );
  });
});
