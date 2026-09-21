import { z } from "zod";

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