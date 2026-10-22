import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import type {
  Category,
  CategoryListResponse,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@fondo/shared-types";
import type { Prisma } from "@fondo/db";

import { PrismaService } from "../prisma.service.js";
import { CategoriesRepository } from "./repositories/categories.repository.js";

const ALLOWED_SORTS = new Set(["name", "type", "createdAt"]);

@Injectable()
export class CategoriesService {
  constructor(
    @Inject(CategoriesRepository)
    private readonly categories: CategoriesRepository,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async list(
    tenantId: string,
    userId: string,
    query: { page: number; pageSize: number; sort?: string; type?: string },
  ): Promise<CategoryListResponse> {
    return this.prisma.withTenantContext({ tenantId, userId }, async (tx) => {
      const orderBy = ALLOWED_SORTS.has(query.sort ?? "")
        ? { [query.sort as string]: "asc" }
        : { createdAt: "asc" as const };
      const type =
        query.type === "INCOME" || query.type === "EXPENSE"
          ? query.type
          : undefined;

      const { items, total } = await this.categories.list(tx, tenantId, {
        page: query.page,
        pageSize: query.pageSize,
        orderBy,
        ...(type !== undefined ? { type } : {}),
      });

      return {
        items: items.map(toCategory),
        total,
        page: query.page,
        pageSize: query.pageSize,
      };
    });
  }

  async create(
    tenantId: string,
    userId: string,
    input: CreateCategoryInput,
  ): Promise<Category> {
    return this.prisma.withTenantContext({ tenantId, userId }, async (tx) => {
      const category = await this.categories.create(tx, tenantId, {
        name: input.name,
        type: input.type,
        isDefault: false,
      });

      await this.audit(tx, tenantId, userId, "CATEGORY_CREATED", category.id);

      return toCategory(category);
    });
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    input: UpdateCategoryInput,
  ): Promise<Category> {
    return this.prisma.withTenantContext({ tenantId, userId }, async (tx) => {
      const existing = await this.categories.findById(tx, tenantId, id);
      if (!existing) {
        throw new NotFoundException("Category not found");
      }

      const result = await this.categories.update(tx, tenantId, id, {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
      });

      if (result.count === 0) {
        throw new NotFoundException("Category not found");
      }

      await this.audit(tx, tenantId, userId, "CATEGORY_UPDATED", id);

      const updated = await this.categories.findById(tx, tenantId, id);
      return toCategory(updated as NonNullable<typeof updated>);
    });
  }

  async archive(
    tenantId: string,
    userId: string,
    id: string,
  ): Promise<{ id: string }> {
    return this.prisma.withTenantContext({ tenantId, userId }, async (tx) => {
      const result = await this.categories.archive(tx, tenantId, id);

      if (result.count === 0) {
        throw new NotFoundException("Category not found");
      }

      await this.audit(tx, tenantId, userId, "CATEGORY_ARCHIVED", id);

      return { id };
    });
  }

  private async audit(
    client: Prisma.TransactionClient,
    tenantId: string,
    actorId: string,
    action: string,
    resource: string,
  ): Promise<void> {
    await client.auditLog.create({
      data: {
        tenantId,
        actorId,
        action,
        resource: `category:${resource}`,
        metadata: { resource },
      },
    });
  }
}

function toCategory(category: {
  id: string;
  name: string;
  type: string;
  isDefault: boolean;
  isActive: boolean;
}): Category {
  return {
    id: category.id,
    name: category.name,
    type: category.type as Category["type"],
    isDefault: category.isDefault,
    isActive: category.isActive,
  };
}
