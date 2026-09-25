import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import type {
  Budget,
  BudgetQuery,
  BudgetResponse,
  UpsertBudgetInput,
} from "@fondo/shared-types";

import { PrismaService } from "../prisma.service.js";
import { LedgerService } from "./ledger.service.js";
import { ReportsRepository } from "./repositories/reports.repository.js";
import {
  BudgetsRepository,
  type BudgetRow,
} from "./repositories/budgets.repository.js";

@Injectable()
export class BudgetsService {
  constructor(
    @Inject(BudgetsRepository) private readonly budgets: BudgetsRepository,
    @Inject(ReportsRepository) private readonly reports: ReportsRepository,
    @Inject(LedgerService) private readonly ledgers: LedgerService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async list(tenantId: string, query: BudgetQuery): Promise<BudgetResponse> {
    const range = resolveRange(query);
    const ledgerId = (await this.ledgers.personalLedger(tenantId)).id;
    const [categories, budgets, rows] = await Promise.all([
      this.prisma.client.category.findMany({
        where: { tenantId, type: "EXPENSE", isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      this.budgets.list(tenantId, range.fromDate, range.toDate),
      this.reports.categoryRows(tenantId, {
        ledgerId,
        from: range.fromDate,
        to: range.toDate,
      }),
    ]);

    const actualByCategory = new Map<string, number>();
    for (const row of rows) {
      if (row.categoryType !== "EXPENSE") {
        continue;
      }
      const amount =
        row.direction === "CREDIT" ? -row.amountMinor : row.amountMinor;
      actualByCategory.set(
        row.categoryId,
        (actualByCategory.get(row.categoryId) ?? 0) + amount,
      );
    }

    const budgetsByCategory = groupBudgets(budgets);
    const singlePeriod = range.from === range.to;

    return {
      period: { from: range.from, to: range.to },
      items: categories.map((category) => {
        const categoryBudgets = budgetsByCategory.get(category.id) ?? [];
        const budgetMinor = sumBudgets(categoryBudgets);
        const actualMinor = actualByCategory.get(category.id) ?? 0;
        return {
          categoryId: category.id,
          categoryName: category.name,
          budgetId:
            singlePeriod && categoryBudgets.length === 1
              ? (categoryBudgets[0]?.id ?? null)
              : null,
          budgetMinor,
          actualMinor,
          remainingMinor:
            budgetMinor === null ? null : budgetMinor - actualMinor,
          utilizationPercent:
            budgetMinor === null || budgetMinor === 0
              ? null
              : roundPercent((actualMinor / budgetMinor) * 100),
        };
      }),
    };
  }

  async upsert(
    tenantId: string,
    actorId: string,
    input: UpsertBudgetInput,
  ): Promise<Budget> {
    const category = await this.prisma.client.category.findFirst({
      where: {
        id: input.categoryId,
        tenantId,
        type: "EXPENSE",
        isActive: true,
      },
    });
    if (!category) {
      throw new NotFoundException("Expense category not found");
    }

    const budget = await this.budgets.upsert(
      tenantId,
      input.categoryId,
      periodStart(input.period),
      input.amountMinor,
    );
    await this.audit(tenantId, actorId, "BUDGET_UPSERTED", budget.id);
    return toBudget(budget);
  }

  async remove(
    tenantId: string,
    actorId: string,
    id: string,
  ): Promise<{ id: string }> {
    const existing = await this.budgets.findById(tenantId, id);
    if (!existing) {
      throw new NotFoundException("Budget not found");
    }

    const result = await this.budgets.delete(tenantId, id);
    if (result.count === 0) {
      throw new NotFoundException("Budget not found");
    }
    await this.audit(tenantId, actorId, "BUDGET_DELETED", id);
    return { id };
  }

  private async audit(
    tenantId: string,
    actorId: string,
    action: string,
    id: string,
  ): Promise<void> {
    await this.prisma.client.auditLog.create({
      data: {
        tenantId,
        actorId,
        action,
        resource: `budget:${id}`,
        metadata: { resource: id },
      },
    });
  }
}

function resolveRange(query: BudgetQuery): {
  from: string;
  to: string;
  fromDate: Date;
  toDate: Date;
} {
  const from = query.from ?? periodOf(new Date());
  const to = query.to ?? from;
  if (from > to) {
    throw new BadRequestException("Budget range is invalid");
  }
  return {
    from,
    to,
    fromDate: periodStart(from),
    toDate: periodEnd(to),
  };
}

function periodOf(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function periodStart(period: string): Date {
  const [year, month] = period.split("-").map(Number);
  return new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, 1));
}

function periodEnd(period: string): Date {
  const [year, month] = period.split("-").map(Number);
  return new Date(Date.UTC(year ?? 0, month ?? 1, 0, 23, 59, 59, 999));
}

function groupBudgets(rows: readonly BudgetRow[]): Map<string, BudgetRow[]> {
  const grouped = new Map<string, BudgetRow[]>();
  for (const row of rows) {
    const current = grouped.get(row.categoryId) ?? [];
    current.push(row);
    grouped.set(row.categoryId, current);
  }
  return grouped;
}

function sumBudgets(rows: readonly BudgetRow[]): number | null {
  if (rows.length === 0) {
    return null;
  }
  return rows.reduce((sum, row) => sum + row.amountMinor, 0);
}

function roundPercent(value: number): number {
  return Math.round(value * 10) / 10;
}

function toBudget(budget: {
  id: string;
  categoryId: string;
  periodStart: Date;
  amountMinor: number;
}): Budget {
  return {
    id: budget.id,
    categoryId: budget.categoryId,
    period: periodOf(budget.periodStart),
    amountMinor: budget.amountMinor,
  };
}
