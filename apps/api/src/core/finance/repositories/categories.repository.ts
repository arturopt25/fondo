import { Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "@fondo/db";

import { PrismaService } from "../../prisma.service.js";

@Injectable()
export class CategoriesRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private scope(
    tenantId: string,
    extra: Prisma.CategoryWhereInput = {},
  ): Prisma.CategoryWhereInput {
    return { tenantId, ...extra };
  }

  async list(
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
      this.prisma.client.category.findMany({
        where,
        orderBy: options.orderBy,
        skip: (options.page - 1) * options.pageSize,
        take: options.pageSize,
      }),
      this.prisma.client.category.count({ where }),
    ]);

    return { items, total };
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.client.category.findFirst({
      where: this.scope(tenantId, { id }),
    });
  }

  async create(tenantId: string, data: Omit<Prisma.CategoryUncheckedCreateInput, "tenantId">) {
    return this.prisma.client.category.create({
      data: { ...data, tenantId },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.CategoryUpdateInput) {
    return this.prisma.client.category.updateMany({
      where: this.scope(tenantId, { id }),
      data,
    });
  }

  async archive(tenantId: string, id: string) {
    return this.prisma.client.category.updateMany({
      where: this.scope(tenantId, { id }),
      data: { isActive: false },
    });
  }
}