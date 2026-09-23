import { NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CategoriesService } from "../../../core/finance/categories.service.js";

function createMocks() {
  const repo = {
    list: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
  };
  const auditLogCreate = vi.fn();
  const prisma = { client: { auditLog: { create: auditLogCreate } } };
  const service = new CategoriesService(repo as never, prisma as never);
  return { repo, auditLogCreate, service };
}

describe("CategoriesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists categories for a tenant", async () => {
    const { repo, service } = createMocks();
    repo.list.mockResolvedValue({
      items: [
        {
          id: "c1",
          name: "Food",
          type: "EXPENSE",
          isDefault: true,
          isActive: true,
        },
      ],
      total: 1,
    });

    const result = await service.list("tenant-1", { page: 1, pageSize: 20 });

    expect(result.items[0]?.name).toBe("Food");
    expect(repo.list).toHaveBeenCalledWith(
      "tenant-1",
      expect.objectContaining({ orderBy: { createdAt: "asc" } }),
    );
  });

  it("creates a custom category and writes an audit log", async () => {
    const { repo, auditLogCreate, service } = createMocks();
    repo.create.mockResolvedValue({
      id: "c1",
      name: "Travel",
      type: "EXPENSE",
      isDefault: false,
      isActive: true,
    });

    await service.create("tenant-1", "user-1", {
      name: "Travel",
      type: "EXPENSE",
    });

    expect(repo.create).toHaveBeenCalledWith("tenant-1", {
      name: "Travel",
      type: "EXPENSE",
      isDefault: false,
    });
    expect(auditLogCreate).toHaveBeenCalledWith({
      data: {
        tenantId: "tenant-1",
        actorId: "user-1",
        action: "CATEGORY_CREATED",
        resource: "category:c1",
        metadata: { resource: "c1" },
      },
    });
  });

  it("throws 404 when archiving a category from another tenant", async () => {
    const { repo, service } = createMocks();
    repo.archive.mockResolvedValue({ count: 0 });

    await expect(
      service.archive("tenant-1", "user-1", "c1"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});