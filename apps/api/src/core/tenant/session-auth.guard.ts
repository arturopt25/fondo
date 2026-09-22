import {
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { fromNodeHeaders } from "better-auth/node";
import type { FastifyRequest } from "fastify";

import { PrismaService } from "../prisma.service.js";
import { isWithinAbsoluteSessionLifetime } from "../auth/session-policy.js";

// Value import required for NestJS decorator metadata (design:paramtypes).
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { createBetterAuth } from "../auth/better-auth.config.js";
import type {
  AuthenticatedRequest,
  CurrentUser,
  TenantContext,
} from "./tenant-context.js";

type BetterAuthInstance = ReturnType<typeof createBetterAuth>;

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    @Inject("BETTER_AUTH")
    private readonly auth: BetterAuthInstance,
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    const session = await this.auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });

    if (!session) {
      throw new UnauthorizedException("Authentication required");
    }

    if (!isWithinAbsoluteSessionLifetime(session.session.createdAt)) {
      throw new UnauthorizedException("Session expired");
    }

    const membership = await this.prisma.client.membership.findFirst({
      where: { userId: session.user.id },
      include: { tenant: true },
      orderBy: { createdAt: "asc" },
    });

    if (!membership) {
      throw new NotFoundException("No personal space found");
    }

    const user: CurrentUser = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image ?? null,
    };

    const tenant: TenantContext = {
      userId: session.user.id,
      tenantId: membership.tenant.id,
      tenantName: membership.tenant.name,
      accountingCurrency: membership.tenant
        .accountingCurrency as "USD" | "EUR",
      timeZone: membership.tenant.timeZone,
      role: membership.role === "ADMIN" ? "ADMIN" : "MEMBER",
    };

    const authenticated = request as AuthenticatedRequest;
    authenticated.user = user;
    authenticated.tenant = tenant;

    return true;
  }
}