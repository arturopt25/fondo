import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import type {
  CashFlowResponse,
  CategorySpendResponse,
  DashboardReport,
  ExchangeRateView,
  PeriodQuery,
  ServiceBalance,
  ServiceKey,
} from "@fondo/shared-types";

import { PrismaService } from "../prisma.service.js";
import { LedgerService } from "./ledger.service.js";
import { TransactionsService } from "./transactions.service.js";
import { TransactionsRepository } from "./repositories/transactions.repository.js";
import {
  ReportsRepository,
  type CategoryRow,
} from "./repositories/reports.repository.js";

const DEFAULT_EXCHANGE_RATE: ExchangeRateView = {
  from: "USD",
  to: "EUR",
  rate: 0.92,
  effectiveAt: "2026-09-01T00:00:00.000Z",
  source: "configured",
};

@Injectable()
export class ReportsService {
  constructor(
    @Inject(ReportsRepository)
    private readonly reports: ReportsRepository,
    @Inject(TransactionsRepository)
    private readonly transactions: TransactionsRepository,
    @Inject(TransactionsService)
    private readonly transactionService: TransactionsService,
    @Inject(LedgerService) private readonly ledgers: LedgerService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async dashboard(
    tenantId: string,
    timeZone: string,
    query: PeriodQuery,
  ): Promise<DashboardReport> {
    const { ledgerId, from, to, serviceKey } = await this.resolveScope(
      tenantId,
      query,
    );
    const rows = await this.reports.categoryRows(tenantId, {
      ledgerId,
      from,
      to,
      serviceKey,
    });
    const { incomeMinor, expenseMinor } = aggregateMovements(rows);

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      balanceMinor: await this.ledgerBalance(tenantId, ledgerId),
      summary: {
        incomeMinor,
        expenseMinor,
        savingsMinor: incomeMinor - expenseMinor,
        savingsRate: savingsRate(incomeMinor, expenseMinor),
      },
      cashFlow: bucketByMonth(rows, timeZone),
      categorySpend: categorySpendOf(rows),
      recent: await this.transactionService.listRecent(tenantId, ledgerId, 5),
      exchangeRate: DEFAULT_EXCHANGE_RATE,
      serviceBalances: await this.serviceBalances(tenantId),
    };
  }

  async cashFlow(
    tenantId: string,
    timeZone: string,
    query: PeriodQuery,
  ): Promise<CashFlowResponse> {
    const { ledgerId, from, to, serviceKey } = await this.resolveScope(
      tenantId,
      query,
    );
    const rows = await this.reports.categoryRows(tenantId, {
      ledgerId,
      from,
      to,
      serviceKey,
    });
    return { items: bucketByMonth(rows, timeZone) };
  }

  async categorySpend(
    tenantId: string,
    query: PeriodQuery,
  ): Promise<CategorySpendResponse> {
    const { ledgerId, from, to, serviceKey } = await this.resolveScope(
      tenantId,
      query,
    );
    const rows = await this.reports.categoryRows(tenantId, {
      ledgerId,
      from,
      to,
      serviceKey,
    });
    return { items: categorySpendOf(rows) };
  }

  private async resolveScope(
    tenantId: string,
    query: PeriodQuery,
  ): Promise<{
    ledgerId: string;
    from: Date;
    to: Date;
    serviceKey?: PeriodQuery["serviceKey"];
  }> {
    const ledgerId =
      query.ledgerId ?? (await this.ledgers.personalLedger(tenantId)).id;
    const now = new Date();
    return {
      ledgerId,
      from: query.from ? new Date(query.from) : monthStart(now),
      to: query.to ? new Date(query.to) : now,
      serviceKey: query.serviceKey,
    };
  }

  private async ledgerBalance(
    tenantId: string,
    ledgerId: string,
  ): Promise<number> {
    const ledger = await this.prisma.client.ledger.findFirst({
      where: { tenantId, id: ledgerId },
      include: { accounts: { where: { isActive: true } } },
    });
    if (!ledger) {
      throw new NotFoundException("Ledger not found");
    }
    const accountIds = ledger.accounts.map((account) => account.id);
    const deltas = await this.transactions.entryBalanceDelta(
      tenantId,
      accountIds,
    );
    return ledger.accounts.reduce(
      (sum, account) =>
        sum + account.openingBalanceMinor + (deltas.get(account.id) ?? 0),
      0,
    );
  }

  private async serviceBalances(tenantId: string): Promise<ServiceBalance[]> {
    const subscriptions =
      await this.prisma.client.serviceSubscription.findMany({
        where: { tenantId, status: "ACTIVE" },
        include: {
          service: { include: { capabilities: true } },
          selections: true,
        },
      });
    const movements = await this.reports.serviceMovements(tenantId);

    return subscriptions.map((subscription) => {
      const serviceKey = subscription.service.key as ServiceKey;
      const activeCapabilityIds = new Set(
        subscription.selections
          .filter((selection) => selection.enabled)
          .map((selection) => selection.capabilityId),
      );
      const capabilities = subscription.service.capabilities
        .filter(
          (capability) =>
            capability.required || activeCapabilityIds.has(capability.id),
        )
        .map((capability) => ({ key: capability.key, balanceMinor: 0 }));

      const balanceByKey = new Map<string, number>();
      let unclassifiedMinor = 0;

      for (const movement of movements) {
        if (movement.serviceKey !== serviceKey) {
          continue;
        }
        const signed = capabilityNetSign(movement);
        if (movement.capabilityKey) {
          balanceByKey.set(
            movement.capabilityKey,
            (balanceByKey.get(movement.capabilityKey) ?? 0) + signed,
          );
        } else {
          unclassifiedMinor += signed;
        }
      }

      const capabilityBalances = capabilities.map((capability) => ({
        key: capability.key,
        balanceMinor: balanceByKey.get(capability.key) ?? 0,
      }));
      const balanceMinor =
        capabilityBalances.reduce(
          (sum, capability) => sum + capability.balanceMinor,
          0,
        ) + unclassifiedMinor;

      return { serviceKey, balanceMinor, capabilities: capabilityBalances };
    });
  }
}

function monthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function signedAmount(row: CategoryRow): number {
  const isExpense = row.categoryType === "EXPENSE";
  const isCredit = row.direction === "CREDIT";
  if (isExpense) {
    return isCredit ? -row.amountMinor : row.amountMinor;
  }
  return isCredit ? row.amountMinor : -row.amountMinor;
}

function capabilityNetSign(movement: {
  readonly direction: string;
  readonly amountMinor: number;
}): number {
  return movement.direction === "CREDIT"
    ? movement.amountMinor
    : -movement.amountMinor;
}

function aggregateMovements(rows: readonly CategoryRow[]): {
  incomeMinor: number;
  expenseMinor: number;
} {
  let incomeMinor = 0;
  let expenseMinor = 0;
  for (const row of rows) {
    if (row.categoryType === "EXPENSE") {
      expenseMinor += signedAmount(row);
    } else {
      incomeMinor += signedAmount(row);
    }
  }
  return { incomeMinor, expenseMinor };
}

function savingsRate(incomeMinor: number, expenseMinor: number): number {
  if (incomeMinor <= 0) {
    return 0;
  }
  return Math.round(((incomeMinor - expenseMinor) / incomeMinor) * 1000) / 10;
}

function bucketKey(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  return `${year}-${month}`;
}

function bucketByMonth(
  rows: readonly CategoryRow[],
  timeZone: string,
): { bucket: string; incomeMinor: number; expenseMinor: number }[] {
  const byBucket = new Map<
    string,
    { incomeMinor: number; expenseMinor: number }
  >();
  for (const row of rows) {
    const bucket = bucketKey(row.occurredAt, timeZone);
    const current = byBucket.get(bucket) ?? { incomeMinor: 0, expenseMinor: 0 };
    const amount = signedAmount(row);
    if (row.categoryType === "EXPENSE") {
      current.expenseMinor += amount;
    } else {
      current.incomeMinor += amount;
    }
    byBucket.set(bucket, current);
  }
  return [...byBucket.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([bucket, values]) => ({ bucket, ...values }));
}

function categorySpendOf(
  rows: readonly CategoryRow[],
): { categoryId: string; categoryName: string; amountMinor: number }[] {
  const byCategory = new Map<
    string,
    { categoryName: string; amountMinor: number }
  >();
  for (const row of rows) {
    if (row.categoryType !== "EXPENSE") {
      continue;
    }
    const current = byCategory.get(row.categoryId) ?? {
      categoryName: row.categoryName,
      amountMinor: 0,
    };
    current.amountMinor += signedAmount(row);
    byCategory.set(row.categoryId, current);
  }
  return [...byCategory.entries()]
    .map(([categoryId, value]) => ({
      categoryId,
      categoryName: value.categoryName,
      amountMinor: value.amountMinor,
    }))
    .sort((a, b) => b.amountMinor - a.amountMinor);
}
