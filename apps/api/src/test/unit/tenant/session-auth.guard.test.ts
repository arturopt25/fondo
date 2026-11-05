import {
  NotFoundException,
  UnauthorizedException,
  type ExecutionContext,
} from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DAY } from "../../../core/auth/session-policy.js";
import { SessionAuthGuard } from "../../../core/tenant/session-auth.guard.js";

function buildMembership() {
  return {
    role: "ADMIN",
    tenantId: "tenant-1",
  };
}

function buildTenant() {
  return {
    id: "tenant-1",
    name: "Arturo's space",
    accountingCurrency: "USD",
    timeZone: "UTC",
  };
}

function createGuard({
  session,
  membership,
}: {
  session: unknown;
  membership: unknown;
}) {
  const getSession = vi.fn().mockResolvedValue(session);
  const resolveTenantContext = vi
    .fn()
    .mockResolvedValue(
      membership ? { membership, tenant: buildTenant() } : null,
    );
  const auth = { api: { getSession } };
  const prisma = { resolveTenantContext };
  const logger = { assign: vi.fn(), debug: vi.fn() };
  const guard = new SessionAuthGuard(
    auth as never,
    prisma as never,
    logger as never,
  );
  return { guard, getSession, resolveTenantContext, logger };
}

function buildContext() {
  const request: Record<string, unknown> = { headers: {} };
  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
  return { request, context };
}

describe("SessionAuthGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("attaches the user and tenant context to the request", async () => {
    const { guard, resolveTenantContext, logger } = createGuard({
      session: {
        session: {
          createdAt: new Date(),
        },
        user: {
          id: "user-1",
          name: "Arturo",
          email: "arturo@example.com",
          image: null,
        },
      },
      membership: buildMembership(),
    });
    const { request, context } = buildContext();

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(resolveTenantContext).toHaveBeenCalledTimes(1);
    expect(resolveTenantContext).toHaveBeenCalledWith("user-1");
    const authenticated = request as unknown as {
      user: { id: string };
      tenant: { tenantId: string; role: string };
      timings: { authMs: number; contextMs: number; guardMs: number };
    };
    expect(authenticated.user.id).toBe("user-1");
    expect(authenticated.tenant.tenantId).toBe("tenant-1");
    expect(authenticated.tenant.role).toBe("ADMIN");
    expect(authenticated.timings.authMs).toBeGreaterThanOrEqual(0);
    expect(authenticated.timings.contextMs).toBeGreaterThanOrEqual(0);
    expect(authenticated.timings.guardMs).toBeGreaterThanOrEqual(0);
    expect(logger.assign).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      userId: "user-1",
    });
  });

  it("rejects requests without a valid session", async () => {
    const { guard, resolveTenantContext } = createGuard({
      session: null,
      membership: null,
    });
    const { context } = buildContext();

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(resolveTenantContext).not.toHaveBeenCalled();
  });

  it("rejects sessions older than the absolute lifetime", async () => {
    const { guard, resolveTenantContext } = createGuard({
      session: {
        session: {
          createdAt: new Date(Date.now() - 31 * DAY * 1000),
        },
        user: { id: "user-1", name: "A", email: "a@b.c", image: null },
      },
      membership: buildMembership(),
    });
    const { context } = buildContext();

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(resolveTenantContext).not.toHaveBeenCalled();
  });

  it("rejects users without a membership with 404", async () => {
    const { guard } = createGuard({
      session: {
        session: {
          createdAt: new Date(),
        },
        user: { id: "user-1", name: "A", email: "a@b.c", image: null },
      },
      membership: null,
    });
    const { context } = buildContext();

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
