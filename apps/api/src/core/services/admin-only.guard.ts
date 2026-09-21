import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";

import type { AuthenticatedRequest } from "../tenant/tenant-context.js";

@Injectable()
export class AdminOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    if (request.tenant.role !== "ADMIN") {
      throw new ForbiddenException("ADMIN role required");
    }

    return true;
  }
}