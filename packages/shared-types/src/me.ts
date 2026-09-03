import { z } from "zod";

export const tenantRoleSchema = z.enum(["ADMIN", "MEMBER"]);
export type TenantRole = z.infer<typeof tenantRoleSchema>;

export const userSettingsSchema = z.object({
  locale: z.enum(["es", "en"]),
  theme: z.enum(["light", "dark", "system"]),
  displayCurrency: z.enum(["USD", "EUR"]),
  timeZone: z.string().min(1).max(64),
});
export type UserSettings = z.infer<typeof userSettingsSchema>;

export const updateUserSettingsSchema = userSettingsSchema.partial();
export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsSchema>;

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(120),
  image: z.string().url().max(2048).nullable().optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const meResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    image: z.string().nullable(),
  }),
  tenant: z.object({
    id: z.string(),
    name: z.string(),
    accountingCurrency: z.enum(["USD", "EUR"]),
    timeZone: z.string(),
  }),
  membership: z.object({
    role: tenantRoleSchema,
  }),
  settings: userSettingsSchema,
});
export type MeResponse = z.infer<typeof meResponseSchema>;
