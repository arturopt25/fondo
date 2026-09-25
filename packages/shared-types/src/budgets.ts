import { z } from "zod";

export const budgetPeriodSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Budget period must use YYYY-MM format");

export const budgetQuerySchema = z
  .object({
    from: budgetPeriodSchema.optional(),
    to: budgetPeriodSchema.optional(),
  })
  .refine((value) => value.from === undefined || value.to !== undefined, {
    message: "Budget range requires both from and to",
    path: ["to"],
  });
export type BudgetQuery = z.infer<typeof budgetQuerySchema>;

export const upsertBudgetSchema = z.object({
  categoryId: z.string().min(1),
  period: budgetPeriodSchema,
  amountMinor: z.number().int().positive(),
});
export type UpsertBudgetInput = z.infer<typeof upsertBudgetSchema>;

export const budgetProgressSchema = z.object({
  categoryId: z.string(),
  categoryName: z.string(),
  budgetId: z.string().nullable(),
  budgetMinor: z.number().int().nullable(),
  actualMinor: z.number().int(),
  remainingMinor: z.number().int().nullable(),
  utilizationPercent: z.number().nullable(),
});
export type BudgetProgress = z.infer<typeof budgetProgressSchema>;

export const budgetResponseSchema = z.object({
  period: z.object({ from: budgetPeriodSchema, to: budgetPeriodSchema }),
  items: z.array(budgetProgressSchema),
});
export type BudgetResponse = z.infer<typeof budgetResponseSchema>;

export const budgetSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  period: budgetPeriodSchema,
  amountMinor: z.number().int().positive(),
});
export type Budget = z.infer<typeof budgetSchema>;
