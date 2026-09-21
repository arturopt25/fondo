import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import type {
  ServiceKey,
  ServiceStatus,
  ServiceWithStatus,
} from "@fondo/shared-types";

import { PrismaService } from "../prisma.service.js";

@Injectable()
export class ServicesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listCatalog(tenantId: string): Promise<ServiceWithStatus[]> {
    const definitions = await this.prisma.client.serviceDefinition.findMany({
      orderBy: { name: "asc" },
    });
    const subscriptions = await this.prisma.client.serviceSubscription.findMany(
      { where: { tenantId } },
    );

    const statusByServiceId = new Map(
      subscriptions.map((subscription) => [
        subscription.serviceId,
        subscription.status,
      ]),
    );

    return definitions.map((definition) => ({
      key: definition.key as ServiceKey,
      name: definition.name,
      description: definition.description,
      status: (statusByServiceId.get(definition.id) ??
        "DISABLED") as ServiceStatus,
    }));
  }

  async activeServices(tenantId: string): Promise<ServiceKey[]> {
    const subscriptions =
      await this.prisma.client.serviceSubscription.findMany({
        where: { tenantId, status: "ACTIVE" },
        include: { service: true },
      });

    return subscriptions.map(
      (subscription) => subscription.service.key as ServiceKey,
    );
  }

  async setStatus(
    tenantId: string,
    actorId: string,
    key: ServiceKey,
    status: ServiceStatus,
  ): Promise<ServiceWithStatus> {
    const definition = await this.prisma.client.serviceDefinition.findUnique({
      where: { key },
    });

    if (!definition) {
      throw new NotFoundException("Service not found");
    }

    await this.prisma.client.serviceSubscription.upsert({
      where: {
        tenantId_serviceId: { tenantId, serviceId: definition.id },
      },
      create: { tenantId, serviceId: definition.id, status },
      update: { status },
    });

    await this.prisma.client.auditLog.create({
      data: {
        tenantId,
        actorId,
        action: status === "ACTIVE" ? "SERVICE_ENABLED" : "SERVICE_DISABLED",
        resource: `service:${key}`,
        metadata: { service: key },
      },
    });

    return {
      key,
      name: definition.name,
      description: definition.description,
      status,
    };
  }
}