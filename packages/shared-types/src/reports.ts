import { z } from "zod";

import { transactionSchema } from "./finance.js";
import { serviceKeySchema } from "./services.js";

export const exchangeRateViewSchema = z.object({
  from: z.string(),
  to: z.string(),
  rate: z.number().positive(),
  effectiveAt: z.string(),
  source: z.string(),
});
export type ExchangeRateView = z.infer<typeof exchangeRateViewSchema>;

export const periodQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  ledgerId: z.string().optional(),
  serviceKey: serviceKeySchema.optional(),
});
export type PeriodQuery = z.infer<typeof periodQuerySchema>;

export const financeSummarySchema = z.object({
  incomeMinor: z.number().int(),
  expenseMinor: z.number().int(),
  savingsMinor: z.number().int(),
  savingsRate: z.number(),
});
export type FinanceSummary = z.infer<typeof financeSummarySchema>;

export const cashFlowPointSchema = z.object({
  bucket: z.string(),
  incomeMinor: z.number().int(),
  expenseMinor: z.number().int(),
});
export type CashFlowPoint = z.infer<typeof cashFlowPointSchema>;

export const categorySpendSchema = z.object({
  categoryId: z.string(),
  categoryName: z.string(),
  amountMinor: z.number().int(),
});
export type CategorySpend = z.infer<typeof categorySpendSchema>;

export const serviceCapabilityBalanceSchema = z.object({
  key: z.string(),
  balanceMinor: z.number().int(),
});
export type ServiceCapabilityBalance = z.infer<
  typeof serviceCapabilityBalanceSchema
>;

export const serviceBalanceSchema = z.object({
  serviceKey: serviceKeySchema,
  balanceMinor: z.number().int(),
  capabilities: z.array(serviceCapabilityBalanceSchema),
});
export type ServiceBalance = z.infer<typeof serviceBalanceSchema>;

export const dashboardReportSchema = z.object({
  period: z.object({ from: z.string(), to: z.string() }),
  balanceMinor: z.number().int(),
  summary: financeSummarySchema,
  cashFlow: z.array(cashFlowPointSchema),
  categorySpend: z.array(categorySpendSchema),
  recent: z.array(transactionSchema),
  exchangeRate: exchangeRateViewSchema.nullable(),
  serviceBalances: z.array(serviceBalanceSchema),
});
export type DashboardReport = z.infer<typeof dashboardReportSchema>;

export const cashFlowResponseSchema = z.object({
  items: z.array(cashFlowPointSchema),
});
export type CashFlowResponse = z.infer<typeof cashFlowResponseSchema>;

export const categorySpendResponseSchema = z.object({
  items: z.array(categorySpendSchema),
});
export type CategorySpendResponse = z.infer<typeof categorySpendResponseSchema>;
