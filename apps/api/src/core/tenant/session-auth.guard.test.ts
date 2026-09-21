import {
  NotFoundException,
  UnauthorizedException,
  type ExecutionContext,
} from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SessionAuthGuard } from "./session-auth.guard.js";

function createGuard({
  session,
  membership,
}: {
  session: unknown;
  membership: unknown;
}) {
  const getSession = vi.fn().mockResolvedValue(session);
  const membershipFindFirst = vi.fn().mockResolvedValue(membership);
  const auth = { api: { getSession } };
  const prisma = {
    client: { membership: { findFirst: membershipFindFirst } },
  };
  const guard = new SessionAuthGuard(auth as never, prisma as never);
  return { guard, getSession, membershipFindFirst };
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
    const { guard } = createGuard({
      session: {
        user: {
          id: "user-1",
          name: "Arturo",
          email: "arturo@example.com",
          image: null,
        },
      },
      membership: {
        role: "ADMIN",
        tenant: {
          id: "tenant-1",
          name: "Arturo's space",
          accountingCurrency: "USD",
          timeZone: "UTC",
        },
      },
    });
    const { request, context } = buildContext();

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    const authenticated = request as unknown as {
      user: { id: string };
      tenant: { tenantId: string; role: string };
    };
    expect(authenticated.user.id).toBe("user-1");
    expect(authenticated.tenant.tenantId).toBe("tenant-1");
    expect(authenticated.tenant.role).toBe("ADMIN");
  });

  it("rejects requests without a valid session", async () => {
    const { guard } = createGuard({ session: null, membership: null });
    const { context } = buildContext();

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("rejects users without a membership with 404", async () => {
    const { guard } = createGuard({
      session: { user: { id: "user-1", name: "A", email: "a@b.c", image: null } },
      membership: null,
    });
    const { context } = buildContext();

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});