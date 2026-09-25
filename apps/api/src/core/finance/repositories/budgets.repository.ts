import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../../prisma.service.js";

export interface BudgetRow {
  readonly id: string;
  readonly categoryId: string;
  readonly periodStart: Date;
  readonly amountMinor: number;
  readonly category: { readonly id: string; readonly name: string };
}

@Injectable()
export class BudgetsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(tenantId: string, from: Date, to: Date): Promise<BudgetRow[]> {
    return this.prisma.client.budget.findMany({
      where: {
        tenantId,
        periodStart: { gte: from, lte: to },
        category: { type: "EXPENSE", isActive: true },
      },
      include: {
        category: { select: { id: true, name: true } },
      },
      orderBy: [{ periodStart: "asc" }, { createdAt: "asc" }],
    });
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.client.budget.findFirst({
      where: { id, tenantId },
    });
  }

  async upsert(
    tenantId: string,
    categoryId: string,
    periodStart: Date,
    amountMinor: number,
  ) {
    return this.prisma.client.budget.upsert({
      where: {
        tenantId_categoryId_periodStart: {
          tenantId,
          categoryId,
          periodStart,
        },
      },
      update: { amountMinor },
      create: {
        tenant: { connect: { id: tenantId } },
        category: { connect: { id: categoryId } },
        periodStart,
        amountMinor,
      },
    });
  }

  async delete(tenantId: string, id: string) {
    return this.prisma.client.budget.deleteMany({
      where: { id, tenantId },
    });
  }
}
