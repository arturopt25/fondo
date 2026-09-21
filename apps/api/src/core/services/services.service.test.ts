import { NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ServicesService } from "./services.service.js";

function createMockPrisma() {
  const serviceDefinitionFindMany = vi.fn();
  const serviceSubscriptionFindMany = vi.fn();
  const serviceDefinitionFindUnique = vi.fn();
  const serviceSubscriptionUpsert = vi.fn();
  const auditLogCreate = vi.fn();

  return {
    client: {
      serviceDefinition: {
        findMany: serviceDefinitionFindMany,
        findUnique: serviceDefinitionFindUnique,
      },
      serviceSubscription: {
        findMany: serviceSubscriptionFindMany,
        upsert: serviceSubscriptionUpsert,
      },
      auditLog: { create: auditLogCreate },
    },
    fns: {
      serviceDefinitionFindMany,
      serviceSubscriptionFindMany,
      serviceDefinitionFindUnique,
      serviceSubscriptionUpsert,
      auditLogCreate,
    },
  };
}

describe("ServicesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists the catalog with per-tenant statuses", async () => {
    const { client, fns } = createMockPrisma();
    fns.serviceDefinitionFindMany.mockResolvedValue([
      { id: "pf", key: "PERSONAL_FINANCE", name: "Personal Finance", description: "PF" },
      { id: "veh", key: "VEHICLE", name: "Vehicle", description: "V" },
    ]);
    fns.serviceSubscriptionFindMany.mockResolvedValue([
      { serviceId: "pf", status: "ACTIVE" },
    ]);
    const service = new ServicesService({ client } as never);

    const result = await service.listCatalog("tenant-1");

    expect(result).toEqual([
      { key: "PERSONAL_FINANCE", name: "Personal Finance", description: "PF", status: "ACTIVE" },
      { key: "VEHICLE", name: "Vehicle", description: "V", status: "DISABLED" },
    ]);
  });

  it("returns only active service keys", async () => {
    const { client, fns } = createMockPrisma();
    fns.serviceSubscriptionFindMany.mockResolvedValue([
      { service: { key: "PERSONAL_FINANCE" } },
    ]);
    const service = new ServicesService({ client } as never);

    const result = await service.activeServices("tenant-1");

    expect(result).toEqual(["PERSONAL_FINANCE"]);
    expect(fns.serviceSubscriptionFindMany).toHaveBeenCalledWith({
      where: { tenantId: "tenant-1", status: "ACTIVE" },
      include: { service: true },
    });
  });

  it("upserts the subscription and writes an audit log", async () => {
    const { client, fns } = createMockPrisma();
    fns.serviceDefinitionFindUnique.mockResolvedValue({
      id: "pf",
      key: "PERSONAL_FINANCE",
      name: "Personal Finance",
      description: "PF",
    });
    fns.serviceSubscriptionUpsert.mockResolvedValue({ status: "DISABLED" });
    fns.auditLogCreate.mockResolvedValue({ id: "log-1" });
    const service = new ServicesService({ client } as never);

    const result = await service.setStatus(
      "tenant-1",
      "user-1",
      "PERSONAL_FINANCE",
      "DISABLED",
    );

    expect(result.status).toBe("DISABLED");
    expect(fns.serviceSubscriptionUpsert).toHaveBeenCalledWith({
      where: {
        tenantId_serviceId: { tenantId: "tenant-1", serviceId: "pf" },
      },
      create: { tenantId: "tenant-1", serviceId: "pf", status: "DISABLED" },
      update: { status: "DISABLED" },
    });
    expect(fns.auditLogCreate).toHaveBeenCalledWith({
      data: {
        tenantId: "tenant-1",
        actorId: "user-1",
        action: "SERVICE_DISABLED",
        resource: "service:PERSONAL_FINANCE",
        metadata: { service: "PERSONAL_FINANCE" },
      },
    });
  });

  it("throws when the service definition does not exist", async () => {
    const { client, fns } = createMockPrisma();
    fns.serviceDefinitionFindUnique.mockResolvedValue(null);
    const service = new ServicesService({ client } as never);

    await expect(
      service.setStatus("tenant-1", "user-1", "VEHICLE", "ACTIVE"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});