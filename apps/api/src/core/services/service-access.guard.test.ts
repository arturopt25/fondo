import { ForbiddenException, type ExecutionContext } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ServiceAccessGuard } from "./service-access.guard.js";

function buildContext(role: "ADMIN" | "MEMBER") {
  const request = {
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
  const serviceDefinitionFindUnique = vi.fn().mockResolvedValue(
    metadataValue ? { id: "pf", key: metadataValue } : null,
  );
  const serviceSubscriptionFindUnique = vi
    .fn()
    .mockResolvedValue(subscription);

  const reflector = { get: reflectorGet };
  const prisma = {
    client: {
      serviceDefinition: { findUnique: serviceDefinitionFindUnique },
      serviceSubscription: { findUnique: serviceSubscriptionFindUnique },
    },
  };
  const guard = new ServiceAccessGuard(reflector as never, prisma as never);
  return { guard, reflectorGet, serviceDefinitionFindUnique, serviceSubscriptionFindUnique };
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
});