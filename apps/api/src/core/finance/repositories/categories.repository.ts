import { Injectable } from "@nestjs/common";
import type { Prisma } from "@fondo/db";

@Injectable()
export class CategoriesRepository {
  private scope(
    tenantId: string,
    extra: Prisma.CategoryWhereInput = {},
  ): Prisma.CategoryWhereInput {
    return { tenantId, ...extra };
  }

  async list(
    client: Prisma.TransactionClient,
    tenantId: string,
    options: {
      page: number;
      pageSize: number;
      orderBy: Record<string, string>;
      type?: "INCOME" | "EXPENSE";
    },
  ) {
    const where = this.scope(
      tenantId,
      options.type ? { type: options.type } : {},
    );
    const [items, total] = await Promise.all([
      client.category.findMany({
        where,
        orderBy: options.orderBy,
        skip: (options.page - 1) * options.pageSize,
        take: options.pageSize,
      }),
      client.category.count({ where }),
    ]);

    return { items, total };
  }

  async findById(
    client: Prisma.TransactionClient,
    tenantId: string,
    id: string,
  ) {
    return client.category.findFirst({
      where: this.scope(tenantId, { id }),
    });
  }

  async create(
    client: Prisma.TransactionClient,
    tenantId: string,
    data: Omit<Prisma.CategoryUncheckedCreateInput, "tenantId">,
  ) {
    return client.category.create({
      data: { ...data, tenantId },
    });
  }

  async update(
    client: Prisma.TransactionClient,
    tenantId: string,
    id: string,
    data: Prisma.CategoryUpdateInput,
  ) {
    return client.category.updateMany({
      where: this.scope(tenantId, { id }),
      data,
    });
  }

  async archive(
    client: Prisma.TransactionClient,
    tenantId: string,
    id: string,
  ) {
    return client.category.updateMany({
      where: this.scope(tenantId, { id }),
      data: { isActive: false },
    });
  }
}
