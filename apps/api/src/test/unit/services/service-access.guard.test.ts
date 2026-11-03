import { ForbiddenException, type ExecutionContext } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ServiceAccessGuard } from "../../../core/services/service-access.guard.js";

function buildContext(role: "ADMIN" | "MEMBER") {
  const request = {
    user: { id: "user-1" },
    tenant: { tenantId: "tenant-1", role },
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
  } as unknown as ExecutionContext;
  return { request, context };
}

function createGuard(metadataValue: unknown, subscription: unknown) {
  const reflectorGet = vi.fn().mockReturnValue(metadataValue);
  const serviceDefinitionFindUnique = vi
    .fn()
    .mockResolvedValue(metadataValue ? { id: "pf", key: metadataValue } : null);
  const serviceSubscriptionFindUnique = vi.fn().mockResolvedValue(subscription);
  const withTenantContext = vi
    .fn()
    .mockImplementation(
      async (
        _context: unknown,
        callback: (tx: unknown) => Promise<unknown>,
      ) =>
        callback({
          serviceSubscription: {
            findUnique: serviceSubscriptionFindUnique,
          },
        }),
    );

  const reflector = { get: reflectorGet };
  const prisma = {
    client: {
      serviceDefinition: { findUnique: serviceDefinitionFindUnique },
      serviceSubscription: { findUnique: serviceSubscriptionFindUnique },
    },
    withTenantContext,
  };
  const guard = new ServiceAccessGuard(reflector as never, prisma as never);
  return {
    guard,
    reflectorGet,
    serviceDefinitionFindUnique,
    serviceSubscriptionFindUnique,
  };
}

function createRlsGuard() {
  const reflectorGet = vi.fn().mockReturnValue("PERSONAL_FINANCE");
  const serviceDefinitionFindUnique = vi
    .fn()
    .mockResolvedValue({ id: "pf", key: "PERSONAL_FINANCE" });
  const serviceSubscriptionFindUnique = vi
    .fn()
    .mockRejectedValue(new Error("RLS context is required"));
  const transactionSubscriptionFindUnique = vi
    .fn()
    .mockResolvedValue({ status: "ACTIVE" });
  const withTenantContext = vi
    .fn()
    .mockImplementation(
      async (
        _context: unknown,
        callback: (tx: unknown) => Promise<unknown>,
      ) =>
        callback({
          serviceSubscription: {
            findUnique: transactionSubscriptionFindUnique,
          },
        }),
    );

  const reflector = { get: reflectorGet };
  const prisma = {
    client: {
      serviceDefinition: { findUnique: serviceDefinitionFindUnique },
      serviceSubscription: { findUnique: serviceSubscriptionFindUnique },
    },
    withTenantContext,
  };
  const guard = new ServiceAccessGuard(reflector as never, prisma as never);

  return { guard, withTenantContext, transactionSubscriptionFindUnique };
}

describe("ServiceAccessGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows requests without a required service", async () => {
    const { guard } = createGuard(undefined, null);
    const { context } = buildContext("MEMBER");

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it("allows access when the required service is active", async () => {
    const { guard } = createGuard("PERSONAL_FINANCE", {
      status: "ACTIVE",
    });
    const { context } = buildContext("MEMBER");

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it("blocks access when the required service is disabled", async () => {
    const { guard } = createGuard("PERSONAL_FINANCE", {
      status: "DISABLED",
    });
    const { context } = buildContext("MEMBER");

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("blocks access when there is no subscription", async () => {
    const { guard } = createGuard("PERSONAL_FINANCE", null);
    const { context } = buildContext("MEMBER");

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("uses a tenant context before querying an RLS-protected subscription", async () => {
    const { guard, withTenantContext, transactionSubscriptionFindUnique } =
      createRlsGuard();
    const { context } = buildContext("MEMBER");

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(withTenantContext).toHaveBeenCalledWith(
      { tenantId: "tenant-1", userId: "user-1" },
      expect.any(Function),
    );
    expect(transactionSubscriptionFindUnique).toHaveBeenCalledWith({
      where: {
        tenantId_serviceId: {
          tenantId: "tenant-1",
          serviceId: "pf",
        },
      },
    });
  });
});
