import type { DisplayCurrency } from "@fondo/shared-types";

export interface ExchangeRate {
  readonly from: "USD";
  readonly to: "EUR";
  readonly rate: number;
  readonly effectiveAt: string;
  readonly source: "mock";
}

export interface FinanceSummary {
  readonly balanceMinor: number;
  readonly incomeMinor: number;
  readonly expenseMinor: number;
  readonly savingsMinor: number;
  readonly savingsRate: number;
}

export interface MonthlyCashFlow {
  readonly month: string;
  readonly income: number;
  readonly expenses: number;
}

export interface CategorySpend {
  readonly name: string;
  readonly amount: number;
  readonly color: string;
}

export interface BudgetProgress {
  readonly name: string;
  readonly spent: number;
  readonly limit: number;
  readonly color: string;
}

export interface RecentTransaction {
  readonly id: string;
  readonly merchantKey: string;
  readonly categoryKey: string;
  readonly date: string;
  readonly amountMinor: number;
  readonly type: "income" | "expense";
}

export const exchangeRate: ExchangeRate = {
  from: "USD",
  to: "EUR",
  rate: 0.92,
  effectiveAt: "2026-09-01T00:00:00.000Z",
  source: "mock",
};

export const financeSummary: FinanceSummary = {
  balanceMinor: 1246800,
  incomeMinor: 620000,
  expenseMinor: 389200,
  savingsMinor: 230800,
  savingsRate: 37.2,
};

export const monthlyCashFlow: readonly MonthlyCashFlow[] = [
  { month: "Apr", income: 480000, expenses: 298000 },
  { month: "May", income: 530000, expenses: 342000 },
  { month: "Jun", income: 510000, expenses: 318000 },
  { month: "Jul", income: 590000, expenses: 365000 },
  { month: "Aug", income: 570000, expenses: 401000 },
  { month: "Sep", income: 620000, expenses: 389200 },
];

export const categorySpend: readonly CategorySpend[] = [
  { name: "housing", amount: 112000, color: "#2ad6d7" },
  { name: "food", amount: 82400, color: "#a78bfa" },
  { name: "transport", amount: 49600, color: "#f6a66a" },
  { name: "leisure", amount: 42200, color: "#f4778a" },
  { name: "other", amount: 103000, color: "#65777b" },
];

export const budgetProgress: readonly BudgetProgress[] = [
  { name: "housing", spent: 112000, limit: 125000, color: "cyan" },
  { name: "food", spent: 82400, limit: 100000, color: "violet" },
  { name: "leisure", spent: 42200, limit: 40000, color: "orange" },
];

export const recentTransactions: readonly RecentTransaction[] = [
  {
    id: "tx-001",
    merchantKey: "coffeeLab",
    categoryKey: "food",
    date: "2026-09-03T08:45:00.000Z",
    amountMinor: -680,
    type: "expense",
  },
  {
    id: "tx-002",
    merchantKey: "northwindSalary",
    categoryKey: "income",
    date: "2026-09-01T09:00:00.000Z",
    amountMinor: 620000,
    type: "income",
  },
  {
    id: "tx-003",
    merchantKey: "metroPass",
    categoryKey: "transport",
    date: "2026-08-31T17:20:00.000Z",
    amountMinor: -4200,
    type: "expense",
  },
  {
    id: "tx-004",
    merchantKey: "streamingService",
    categoryKey: "leisure",
    date: "2026-08-29T12:10:00.000Z",
    amountMinor: -1599,
    type: "expense",
  },
];

export function convertFromUsd(
  amountMinor: number,
  currency: DisplayCurrency,
): number {
  if (currency === "USD") {
    return amountMinor;
  }

  return Math.round(amountMinor * exchangeRate.rate);
}

export function formatMinorAmount(
  amountMinor: number,
  currency: DisplayCurrency,
  locale: string,
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(convertFromUsd(amountMinor, currency) / 100);
}

export function formatDate(
  date: string,
  locale: string,
  timeZone = "America/New_York",
): string {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    timeZone,
  }).format(new Date(date));
}
