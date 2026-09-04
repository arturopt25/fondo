import {
  Inject,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { fromNodeHeaders } from "better-auth/node";
import type { FastifyRequest } from "fastify";

// Value import required for NestJS decorator metadata (design:paramtypes).
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { createBetterAuth } from "../auth/better-auth.config.js";
import type { AuthenticatedRequest, CurrentUser } from "./tenant-context.js";

type BetterAuthInstance = ReturnType<typeof createBetterAuth>;

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    @Inject("BETTER_AUTH")
    private readonly auth: BetterAuthInstance,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    const session = await this.auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });

    if (!session) {
      throw new UnauthorizedException("Authentication required");
    }

    const user: CurrentUser = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image ?? null,
    };

    (request as AuthenticatedRequest).user = user;

    return true;
  }
}
