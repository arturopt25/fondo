import {
  ForbiddenException,
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import type { ServiceKey } from "@fondo/shared-types";

import { PrismaService } from "../prisma.service.js";
import type { AuthenticatedRequest } from "../tenant/tenant-context.js";
import { REQUIRED_SERVICE_KEY } from "./required-service.decorator.js";

@Injectable()
export class ServiceAccessGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const key = this.reflector.get<ServiceKey>(
      REQUIRED_SERVICE_KEY,
      context.getHandler(),
    );

    if (!key) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    const definition = await this.prisma.client.serviceDefinition.findUnique({
      where: { key },
    });

    if (!definition) {
      return true;
    }

    const subscription = await this.prisma.client.serviceSubscription.findUnique(
      {
        where: {
          tenantId_serviceId: {
            tenantId: request.tenant.tenantId,
            serviceId: definition.id,
          },
        },
      },
    );

    if (!subscription || subscription.status !== "ACTIVE") {
      throw new ForbiddenException("Service is not active");
    }

    return true;
  }
}