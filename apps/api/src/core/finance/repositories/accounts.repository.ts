import { Injectable } from "@nestjs/common";
import type { Prisma } from "@fondo/db";

@Injectable()
export class AccountsRepository {
  private scope(
    tenantId: string,
    extra: Prisma.FinancialAccountWhereInput = {},
  ): Prisma.FinancialAccountWhereInput {
    return { tenantId, ...extra };
  }

  async list(
    client: Prisma.TransactionClient,
    tenantId: string,
    options: {
      page: number;
      pageSize: number;
      orderBy: Record<string, string>;
    },
  ) {
    const [items, total] = await Promise.all([
      client.financialAccount.findMany({
        where: this.scope(tenantId),
        orderBy: options.orderBy,
        skip: (options.page - 1) * options.pageSize,
        take: options.pageSize,
      }),
      client.financialAccount.count({
        where: this.scope(tenantId),
      }),
    ]);

    return { items, total };
  }

  async findById(
    client: Prisma.TransactionClient,
    tenantId: string,
    id: string,
  ) {
    return client.financialAccount.findFirst({
      where: this.scope(tenantId, { id }),
    });
  }

  async create(
    client: Prisma.TransactionClient,
    tenantId: string,
    ledgerId: string,
    data: Omit<
      Prisma.FinancialAccountUncheckedCreateInput,
      "tenantId" | "ledgerId"
    >,
  ) {
    return client.financialAccount.create({
      data: { ...data, tenantId, ledgerId },
    });
  }

  async update(
    client: Prisma.TransactionClient,
    tenantId: string,
    id: string,
    data: Prisma.FinancialAccountUpdateInput,
  ) {
    return client.financialAccount.updateMany({
      where: this.scope(tenantId, { id }),
      data,
    });
  }

  async archive(
    client: Prisma.TransactionClient,
    tenantId: string,
    id: string,
  ) {
    return client.financialAccount.updateMany({
      where: this.scope(tenantId, { id }),
      data: { isActive: false },
    });
  }
}
