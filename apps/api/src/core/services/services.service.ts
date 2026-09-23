import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import type {
  ServiceCapability,
  ServiceKey,
  ServiceLedgerMode,
  ServiceStatus,
  ServiceWithCapabilities,
  UpdateServiceConfigInput,
} from "@fondo/shared-types";

import { PrismaService } from "../prisma.service.js";

@Injectable()
export class ServicesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listCatalog(tenantId: string): Promise<ServiceWithCapabilities[]> {
    const definitions = await this.prisma.client.serviceDefinition.findMany({
      orderBy: { name: "asc" },
      include: {
        capabilities: { orderBy: { sortOrder: "asc" } },
      },
    });
    const subscriptions = await this.prisma.client.serviceSubscription.findMany(
      {
        where: { tenantId },
        include: { selections: true },
      },
    );

    const subscriptionByServiceId = new Map(
      subscriptions.map((subscription) => [
        subscription.serviceId,
        subscription,
      ]),
    );

    return definitions.map((definition) => {
      const subscription = subscriptionByServiceId.get(definition.id);

      return {
        key: definition.key as ServiceKey,
        name: definition.name,
        description: definition.description,
        status: (subscription?.status ?? "DISABLED") as ServiceStatus,
        ledgerMode: (subscription?.ledgerMode ?? "SHARED") as ServiceLedgerMode,
        capabilities: definition.capabilities.map((capability) => ({
          key: capability.key,
          name: capability.name,
          description: capability.description,
          required: capability.required,
          defaultEnabled: capability.defaultEnabled,
          dependsOn: capability.dependsOn,
        })),
        selectedCapabilities: subscription
          ? subscription.selections
              .filter((selection) => selection.enabled)
              .map((selection) => selection.capabilityId)
              .map(
                (capabilityId) =>
                  definition.capabilities.find(
                    (capability) => capability.id === capabilityId,
                  )?.key ?? "",
              )
              .filter((key) => key !== "")
          : [],
      };
    });
  }

  async activeServices(tenantId: string): Promise<ServiceKey[]> {
    const subscriptions = await this.prisma.client.serviceSubscription.findMany(
      {
        where: { tenantId, status: "ACTIVE" },
        include: { service: true },
      },
    );

    return subscriptions.map(
      (subscription) => subscription.service.key as ServiceKey,
    );
  }

  async configure(
    tenantId: string,
    actorId: string,
    key: ServiceKey,
    input: UpdateServiceConfigInput,
  ): Promise<ServiceWithCapabilities> {
    const definition = await this.prisma.client.serviceDefinition.findUnique({
      where: { key },
      include: { capabilities: true },
    });

    if (!definition) {
      throw new NotFoundException("Service not found");
    }

    const selected = resolveSelection(definition, input.capabilities);
    assertDependencies(definition, selected);

    if (
      input.ledgerMode === "SEPARATE" &&
      definition.key !== "ENTREPRENEURSHIP"
    ) {
      throw new BadRequestException(
        "A separate ledger is only available for Entrepreneurship",
      );
    }

    const subscription = await this.prisma.client.$transaction(async (tx) => {
      const upserted = await tx.serviceSubscription.upsert({
        where: {
          tenantId_serviceId: { tenantId, serviceId: definition.id },
        },
        create: {
          tenantId,
          serviceId: definition.id,
          status: "ACTIVE",
          ledgerMode: input.ledgerMode ?? "SHARED",
        },
        update: {
          status: "ACTIVE",
          ...(input.ledgerMode !== undefined
            ? { ledgerMode: input.ledgerMode }
            : {}),
        },
      });

      await tx.serviceCapabilitySelection.deleteMany({
        where: { subscriptionId: upserted.id },
      });

      await tx.serviceCapabilitySelection.createMany({
        data: selected.map((capabilityId) => ({
          subscriptionId: upserted.id,
          capabilityId,
          enabled: true,
        })),
      });

      return upserted;
    });

    await this.prisma.client.auditLog.create({
      data: {
        tenantId,
        actorId,
        action: "SERVICE_CONFIGURED",
        resource: `service:${key}`,
        metadata: {
          service: key,
          capabilities: selected,
          ledgerMode: input.ledgerMode ?? "SHARED",
        },
      },
    });

    return this.toServiceWithCapabilities(definition, subscription);
  }

  async disable(
    tenantId: string,
    actorId: string,
    key: ServiceKey,
  ): Promise<ServiceWithCapabilities> {
    const definition = await this.prisma.client.serviceDefinition.findUnique({
      where: { key },
      include: { capabilities: true },
    });

    if (!definition) {
      throw new NotFoundException("Service not found");
    }

    await this.prisma.client.serviceSubscription.upsert({
      where: {
        tenantId_serviceId: { tenantId, serviceId: definition.id },
      },
      create: {
        tenantId,
        serviceId: definition.id,
        status: "DISABLED",
      },
      update: { status: "DISABLED" },
    });

    await this.prisma.client.auditLog.create({
      data: {
        tenantId,
        actorId,
        action: "SERVICE_DISABLED",
        resource: `service:${key}`,
        metadata: { service: key },
      },
    });

    const current = await this.prisma.client.serviceSubscription.findUnique({
      where: {
        tenantId_serviceId: { tenantId, serviceId: definition.id },
      },
      include: { selections: true },
    });

    return this.toServiceWithCapabilities(
      definition,
      current as NonNullable<typeof current>,
    );
  }

  private toServiceWithCapabilities(
    definition: {
      id: string;
      key: ServiceKey;
      name: string;
      description: string;
      capabilities: {
        id: string;
        key: string;
        name: string;
        description: string;
        required: boolean;
        defaultEnabled: boolean;
        dependsOn: string[];
      }[];
    },
    subscription: {
      status: ServiceStatus;
      ledgerMode: ServiceLedgerMode;
      selections?: { capabilityId: string; enabled: boolean }[];
    },
  ): ServiceWithCapabilities {
    const selectedIds = new Set(
      (subscription.selections ?? [])
        .filter((selection) => selection.enabled)
        .map((selection) => selection.capabilityId),
    );

    return {
      key: definition.key,
      name: definition.name,
      description: definition.description,
      status: subscription.status,
      ledgerMode: subscription.ledgerMode,
      capabilities: definition.capabilities.map(
        (capability): ServiceCapability => {
          return {
            key: capability.key,
            name: capability.name,
            description: capability.description,
            required: capability.required,
            defaultEnabled: capability.defaultEnabled,
            dependsOn: capability.dependsOn,
          };
        },
      ),
      selectedCapabilities: definition.capabilities
        .filter((capability) => selectedIds.has(capability.id))
        .map((capability) => capability.key),
    };
  }
}

function resolveSelection(
  definition: {
    capabilities: {
      id: string;
      key: string;
      required: boolean;
      defaultEnabled: boolean;
    }[];
  },
  requested: string[] | undefined,
): string[] {
  const requestedKeys = new Set(requested ?? []);
  const finalKeys = new Set<string>();

  for (const capability of definition.capabilities) {
    if (capability.required) {
      finalKeys.add(capability.id);
      continue;
    }
    if (requested === undefined && capability.defaultEnabled) {
      finalKeys.add(capability.id);
      continue;
    }
    if (requestedKeys.has(capability.key)) {
      finalKeys.add(capability.id);
    }
  }

  return [...finalKeys];
}

function assertDependencies(
  definition: {
    capabilities: { id: string; key: string; dependsOn: string[] }[];
  },
  selectedIds: string[],
): void {
  const selectedIdsSet = new Set(selectedIds);
  const keyById = new Map(definition.capabilities.map((c) => [c.id, c]));

  for (const id of selectedIds) {
    const capability = keyById.get(id);
    if (!capability) {
      continue;
    }
    for (const dependency of capability.dependsOn) {
      const dependencyId = definition.capabilities.find(
        (c) => c.key === dependency,
      )?.id;
      if (dependencyId && !selectedIdsSet.has(dependencyId)) {
        throw new BadRequestException(
          `Capability "${capability.key}" requires "${dependency}"`,
        );
      }
    }
  }
}
