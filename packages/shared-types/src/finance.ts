import { z } from "zod";

import { serviceKeySchema } from "./services.js";

export const accountTypeSchema = z.enum([
  "CASH",
  "BANK",
  "CREDIT_CARD",
  "OTHER",
]);
export type AccountType = z.infer<typeof accountTypeSchema>;

export const categoryTypeSchema = z.enum(["INCOME", "EXPENSE"]);
export type CategoryType = z.infer<typeof categoryTypeSchema>;

export const financialAccountSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: accountTypeSchema,
  currency: z.string(),
  openingBalanceMinor: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.string(),
});
export type FinancialAccount = z.infer<typeof financialAccountSchema>;

export const createAccountSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: accountTypeSchema,
  currency: z.string().length(3).default("USD"),
  openingBalanceMinor: z.number().int().default(0),
});
export type CreateAccountInput = z.infer<typeof createAccountSchema>;

export const updateAccountSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    type: accountTypeSchema.optional(),
  })
  .refine((value) => value.name !== undefined || value.type !== undefined, {
    message: "Provide at least one field to update",
  });
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

export const accountListResponseSchema = z.object({
  items: z.array(financialAccountSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export type AccountListResponse = z.infer<typeof accountListResponseSchema>;

export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: categoryTypeSchema,
  isDefault: z.boolean(),
  isActive: z.boolean(),
});
export type Category = z.infer<typeof categorySchema>;

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: categoryTypeSchema,
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    type: categoryTypeSchema.optional(),
  })
  .refine((value) => value.name !== undefined || value.type !== undefined, {
    message: "Provide at least one field to update",
  });
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const categoryListResponseSchema = z.object({
  items: z.array(categorySchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export type CategoryListResponse = z.infer<typeof categoryListResponseSchema>;

export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type PageQuery = z.infer<typeof pageQuerySchema>;

export const transactionTypeSchema = z.enum(["INCOME", "EXPENSE", "TRANSFER"]);
export type TransactionType = z.infer<typeof transactionTypeSchema>;

export const entryDirectionSchema = z.enum(["DEBIT", "CREDIT"]);
export type EntryDirection = z.infer<typeof entryDirectionSchema>;

export const transactionEntrySchema = z.object({
  id: z.string(),
  direction: entryDirectionSchema,
  amountMinor: z.number().int().positive(),
  accountId: z.string().nullable(),
  categoryId: z.string().nullable(),
});
export type TransactionEntry = z.infer<typeof transactionEntrySchema>;

export const transactionSchema = z.object({
  id: z.string(),
  type: transactionTypeSchema,
  amountMinor: z.number().int(),
  categoryId: z.string().nullable(),
  accountId: z.string().nullable(),
  transferFromId: z.string().nullable(),
  transferToId: z.string().nullable(),
  serviceKey: serviceKeySchema.nullable(),
  sourceType: z.string().nullable(),
  sourceId: z.string().nullable(),
  note: z.string().nullable(),
  occurredAt: z.string(),
  createdAt: z.string(),
  reversesId: z.string().nullable(),
  reversedById: z.string().nullable(),
  entries: z.array(transactionEntrySchema),
});
export type Transaction = z.infer<typeof transactionSchema>;

export const reverseTransactionSchema = z.object({
  note: z.string().trim().max(500).optional(),
});
export type ReverseTransactionInput = z.infer<typeof reverseTransactionSchema>;

export const createIncomeSchema = z.object({
  accountId: z.string(),
  categoryId: z.string(),
  amountMinor: z.number().int().positive(),
  occurredAt: z.string().datetime().optional(),
  note: z.string().trim().max(500).optional(),
  serviceKey: serviceKeySchema.optional(),
  sourceType: z.string().max(32).optional(),
  sourceId: z.string().optional(),
});
export type CreateIncomeInput = z.infer<typeof createIncomeSchema>;

export const createExpenseSchema = z.object({
  accountId: z.string(),
  categoryId: z.string(),
  amountMinor: z.number().int().positive(),
  occurredAt: z.string().datetime().optional(),
  note: z.string().trim().max(500).optional(),
  serviceKey: serviceKeySchema.optional(),
  sourceType: z.string().max(32).optional(),
  sourceId: z.string().optional(),
});
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

export const createTransferSchema = z.object({
  fromAccountId: z.string(),
  toAccountId: z.string(),
  amountMinor: z.number().int().positive(),
  occurredAt: z.string().datetime().optional(),
  note: z.string().trim().max(500).optional(),
});
export type CreateTransferInput = z.infer<typeof createTransferSchema>;

export const transactionListResponseSchema = z.object({
  items: z.array(transactionSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export type TransactionListResponse = z.infer<
  typeof transactionListResponseSchema
>;

export const accountBalanceSchema = z.object({
  id: z.string(),
  name: z.string(),
  balanceMinor: z.number().int(),
});
export type AccountBalance = z.infer<typeof accountBalanceSchema>;

export const ledgerBalanceResponseSchema = z.object({
  ledgerId: z.string(),
  totalMinor: z.number().int(),
  accounts: z.array(accountBalanceSchema),
});
export type LedgerBalanceResponse = z.infer<typeof ledgerBalanceResponseSchema>;
