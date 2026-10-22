import { Injectable } from "@nestjs/common";
import type { Prisma } from "@fondo/db";

export interface BudgetRow {
  readonly id: string;
  readonly categoryId: string;
  readonly periodStart: Date;
  readonly amountMinor: number;
  readonly category: { readonly id: string; readonly name: string };
}

@Injectable()
export class BudgetsRepository {
  async list(
    client: Prisma.TransactionClient,
    tenantId: string,
    from: Date,
    to: Date,
  ): Promise<BudgetRow[]> {
    return client.budget.findMany({
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

  async findById(
    client: Prisma.TransactionClient,
    tenantId: string,
    id: string,
  ) {
    return client.budget.findFirst({
      where: { id, tenantId },
    });
  }

  async upsert(
    client: Prisma.TransactionClient,
    tenantId: string,
    categoryId: string,
    periodStart: Date,
    amountMinor: number,
  ) {
    return client.budget.upsert({
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

  async delete(client: Prisma.TransactionClient, tenantId: string, id: string) {
    return client.budget.deleteMany({
      where: { id, tenantId },
    });
  }
}
