import { Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "@fondo/db";

import { PrismaService } from "../../prisma.service.js";

@Injectable()
export class AccountsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private scope(
    tenantId: string,
    extra: Prisma.FinancialAccountWhereInput = {},
  ): Prisma.FinancialAccountWhereInput {
    return { tenantId, ...extra };
  }

  async list(
    tenantId: string,
    options: { page: number; pageSize: number; orderBy: Record<string, string> },
  ) {
    const [items, total] = await Promise.all([
      this.prisma.client.financialAccount.findMany({
        where: this.scope(tenantId),
        orderBy: options.orderBy,
        skip: (options.page - 1) * options.pageSize,
        take: options.pageSize,
      }),
      this.prisma.client.financialAccount.count({
        where: this.scope(tenantId),
      }),
    ]);

    return { items, total };
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.client.financialAccount.findFirst({
      where: this.scope(tenantId, { id }),
    });
  }

  async create(
    tenantId: string,
    data: Omit<Prisma.FinancialAccountUncheckedCreateInput, "tenantId">,
  ) {
    return this.prisma.client.financialAccount.create({
      data: { ...data, tenantId },
    });
  }

  async update(
    tenantId: string,
    id: string,
    data: Prisma.FinancialAccountUpdateInput,
  ) {
    return this.prisma.client.financialAccount.updateMany({
      where: this.scope(tenantId, { id }),
      data,
    });
  }

  async archive(tenantId: string, id: string) {
    return this.prisma.client.financialAccount.updateMany({
      where: this.scope(tenantId, { id }),
      data: { isActive: false },
    });
  }
}