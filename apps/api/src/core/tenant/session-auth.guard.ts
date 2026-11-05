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
import { PinoLogger } from "nestjs-pino";

import { PrismaService } from "../prisma.service.js";
import { isWithinAbsoluteSessionLifetime } from "../auth/session-policy.js";
import type { TimedRequest } from "../observability/request-timing.js";

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
    @Inject(PinoLogger)
    private readonly logger: PinoLogger,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<FastifyRequest & TimedRequest>();
    const guardStartedAt = performance.now();

    const authStartedAt = performance.now();
    const session = await this.auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });
    const authMs = performance.now() - authStartedAt;

    if (!session) {
      throw new UnauthorizedException("Authentication required");
    }

    if (!isWithinAbsoluteSessionLifetime(session.session.createdAt)) {
      throw new UnauthorizedException("Session expired");
    }

    const contextStartedAt = performance.now();
    const resolved = await this.prisma.resolveTenantContext(session.user.id);
    const contextMs = performance.now() - contextStartedAt;

    if (!resolved) {
      throw new NotFoundException("No personal space found");
    }

    const { membership, tenant: tenantRecord } = resolved;

    const user: CurrentUser = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image ?? null,
    };

    const tenant: TenantContext = {
      userId: session.user.id,
      tenantId: tenantRecord.id,
      tenantName: tenantRecord.name,
      accountingCurrency: tenantRecord.accountingCurrency as "USD" | "EUR",
      timeZone: tenantRecord.timeZone,
      role: membership.role === "ADMIN" ? "ADMIN" : "MEMBER",
    };

    const authenticated = request as AuthenticatedRequest & TimedRequest;
    authenticated.user = user;
    authenticated.tenant = tenant;
    authenticated.timings = {
      authMs,
      contextMs,
      guardMs: performance.now() - guardStartedAt,
    };
    this.logger.assign({ tenantId: tenant.tenantId, userId: user.id });
    this.logger.debug(authenticated.timings, "session guard timing");

    return true;
  }
}
