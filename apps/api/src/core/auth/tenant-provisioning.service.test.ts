import { beforeEach, describe, expect, it, vi } from "vitest";

import { TenantProvisioningService } from "./tenant-provisioning.service.js";

function createMockPrisma() {
  const tenantFindFirst = vi.fn();
  const tenantCreate = vi.fn();
  const transaction = vi.fn();
  const membershipCreate = vi.fn();
  const userSettingsCreate = vi.fn();

  return {
    client: {
      tenant: {
        findFirst: tenantFindFirst,
        create: tenantCreate,
      },
      membership: {
        create: membershipCreate,
      },
      userSettings: {
        create: userSettingsCreate,
      },
      $transaction: transaction,
    },
    fns: {
      tenantFindFirst,
      tenantCreate,
      transaction,
      membershipCreate,
      userSettingsCreate,
    },
  };
}

describe("TenantProvisioningService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a personal tenant, an ADMIN membership and default settings", async () => {
    const { client, fns } = createMockPrisma();
    fns.tenantFindFirst.mockResolvedValue(null);
    fns.tenantCreate.mockResolvedValue({ id: "tenant-1" });
    fns.transaction.mockResolvedValue([{}, {}]);
    const service = new TenantProvisioningService({ client } as never);

    await service.provisionForUser("user-1", "Arturo");

    expect(fns.tenantCreate).toHaveBeenCalledWith({
      data: {
        name: "Arturo's space",
        slug: expect.stringContaining("arturo-user-1"),
        ownerUserId: "user-1",
      },
    });
    expect(fns.transaction).toHaveBeenCalledTimes(1);
    const calls = fns.transaction.mock.calls[0]?.[0] as unknown[] | undefined;
    expect(calls).toHaveLength(2);
  });

  it("is idempotent when the tenant already exists", async () => {
    const { client, fns } = createMockPrisma();
    fns.tenantFindFirst.mockResolvedValue({ id: "tenant-1" });
    const service = new TenantProvisioningService({ client } as never);

    await service.provisionForUser("user-1", "Arturo");

    expect(fns.tenantCreate).not.toHaveBeenCalled();
    expect(fns.transaction).not.toHaveBeenCalled();
  });

  it("does not throw when provisioning fails", async () => {
    const { client, fns } = createMockPrisma();
    fns.tenantFindFirst.mockResolvedValue(null);
    fns.tenantCreate.mockRejectedValue(new Error("duplicate"));
    const service = new TenantProvisioningService({ client } as never);

    await expect(
      service.provisionForUser("user-1", "Arturo"),
    ).resolves.toBeUndefined();
  });
});
