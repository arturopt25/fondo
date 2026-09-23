import { BadRequestException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ServicesService } from "./services.service.js";

function createMockPrisma() {
  const client = {
    serviceDefinition: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    serviceSubscription: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      updateMany: vi.fn(),
      findUnique: vi.fn(),
    },
    serviceCapabilitySelection: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(async (callback: (tx: typeof client) => unknown) =>
      callback(client),
    ),
  };
  const prisma = { client };
  return { prisma, fns: client };
}

function capability(
  id: string,
  key: string,
  extra: Partial<Record<string, unknown>> = {},
) {
  return {
    id,
    key,
    name: key,
    description: key,
    required: false,
    defaultEnabled: false,
    dependsOn: [] as string[],
    sortOrder: 1,
    ...extra,
  };
}

describe("ServicesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists the catalog with capabilities, ledger mode and selections", async () => {
    const { prisma, fns } = createMockPrisma();
    fns.serviceDefinition.findMany.mockResolvedValue([
      {
        id: "pf",
        key: "PERSONAL_FINANCE",
        name: "Personal Finance",
        description: "PF",
        capabilities: [
          capability("c1", "accounts", {
            required: true,
            defaultEnabled: true,
          }),
          capability("c2", "budgets", { defaultEnabled: true }),
        ],
      },
      {
        id: "veh",
        key: "VEHICLE",
        name: "Vehicle",
        description: "V",
        capabilities: [capability("c3", "vehicles", { required: true })],
      },
    ]);
    fns.serviceSubscription.findMany.mockResolvedValue([
      {
        serviceId: "pf",
        status: "ACTIVE",
        ledgerMode: "SHARED",
        selections: [{ capabilityId: "c1", enabled: true }],
      },
    ]);
    const service = new ServicesService(prisma as never);

    const result = await service.listCatalog("tenant-1");

    expect(result[0]).toMatchObject({
      key: "PERSONAL_FINANCE",
      status: "ACTIVE",
      ledgerMode: "SHARED",
      selectedCapabilities: ["accounts"],
    });
    expect(result[0]?.capabilities).toHaveLength(2);
    expect(result[1]).toMatchObject({ key: "VEHICLE", status: "DISABLED" });
  });

  it("returns only active service keys", async () => {
    const { prisma, fns } = createMockPrisma();
    fns.serviceSubscription.findMany.mockResolvedValue([
      { service: { key: "PERSONAL_FINANCE" } },
    ]);
    const service = new ServicesService(prisma as never);

    const result = await service.activeServices("tenant-1");

    expect(result).toEqual(["PERSONAL_FINANCE"]);
    expect(fns.serviceSubscription.findMany).toHaveBeenCalledWith({
      where: { tenantId: "tenant-1", status: "ACTIVE" },
      include: { service: true },
    });
  });

  it("configures a service selecting required and default capabilities", async () => {
    const { prisma, fns } = createMockPrisma();
    fns.serviceDefinition.findUnique.mockResolvedValue({
      id: "pf",
      key: "PERSONAL_FINANCE",
      name: "Personal Finance",
      description: "PF",
      capabilities: [
        capability("c1", "accounts", { required: true }),
        capability("c2", "budgets", { defaultEnabled: true }),
        capability("c3", "recurring"),
      ],
    });
    fns.serviceSubscription.upsert.mockResolvedValue({
      id: "sub-1",
      status: "ACTIVE",
      ledgerMode: "SHARED",
    });
    fns.serviceCapabilitySelection.createMany.mockResolvedValue({ count: 2 });
    const service = new ServicesService(prisma as never);

    const result = await service.configure(
      "tenant-1",
      "user-1",
      "PERSONAL_FINANCE",
      {},
    );

    expect(result.status).toBe("ACTIVE");
    expect(fns.serviceCapabilitySelection.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ capabilityId: "c1" }),
        expect.objectContaining({ capabilityId: "c2" }),
      ]),
    });
    expect(fns.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "SERVICE_CONFIGURED",
        resource: "service:PERSONAL_FINANCE",
      }),
    });
  });

  it("rejects a configuration that misses a dependency", async () => {
    const { prisma, fns } = createMockPrisma();
    fns.serviceDefinition.findUnique.mockResolvedValue({
      id: "biz",
      key: "ENTREPRENEURSHIP",
      name: "Entrepreneurship",
      description: "E",
      capabilities: [
        capability("c1", "business", { required: true }),
        capability("c2", "clients"),
        capability("c3", "projects", { dependsOn: ["clients"] }),
      ],
    });
    const service = new ServicesService(prisma as never);

    await expect(
      service.configure("tenant-1", "user-1", "ENTREPRENEURSHIP", {
        capabilities: ["projects"],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects a separate ledger for non-entrepreneurship services", async () => {
    const { prisma, fns } = createMockPrisma();
    fns.serviceDefinition.findUnique.mockResolvedValue({
      id: "veh",
      key: "VEHICLE",
      name: "Vehicle",
      description: "V",
      capabilities: [capability("c1", "vehicles", { required: true })],
    });
    const service = new ServicesService(prisma as never);

    await expect(
      service.configure("tenant-1", "user-1", "VEHICLE", {
        ledgerMode: "SEPARATE",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("disables a service and writes an audit log", async () => {
    const { prisma, fns } = createMockPrisma();
    fns.serviceDefinition.findUnique.mockResolvedValue({
      id: "veh",
      key: "VEHICLE",
      name: "Vehicle",
      description: "V",
      capabilities: [capability("c1", "vehicles", { required: true })],
    });
    fns.serviceSubscription.upsert.mockResolvedValue({
      id: "sub-1",
      status: "DISABLED",
      ledgerMode: "SHARED",
    });
    fns.serviceSubscription.findUnique.mockResolvedValue({
      status: "DISABLED",
      ledgerMode: "SHARED",
      selections: [],
    });
    const service = new ServicesService(prisma as never);

    const result = await service.disable("tenant-1", "user-1", "VEHICLE");

    expect(result.status).toBe("DISABLED");
    expect(fns.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "SERVICE_DISABLED" }),
    });
  });

  it("throws when the service definition does not exist", async () => {
    const { prisma, fns } = createMockPrisma();
    fns.serviceDefinition.findUnique.mockResolvedValue(null);
    const service = new ServicesService(prisma as never);

    await expect(
      service.configure("tenant-1", "user-1", "VEHICLE", {}),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
