import { z } from "zod";

import { displayCurrencySchema, localeSchema, themeSchema } from "./enums.js";
import { timeZoneSchema } from "./timezone.js";

export const tenantRoleSchema = z.enum(["ADMIN", "MEMBER"]);
export type TenantRole = z.infer<typeof tenantRoleSchema>;

export const userSettingsSchema = z.object({
  locale: localeSchema,
  theme: themeSchema,
  displayCurrency: displayCurrencySchema,
  timeZone: timeZoneSchema,
});
export type UserSettings = z.infer<typeof userSettingsSchema>;

export const updateUserSettingsSchema = userSettingsSchema.partial();
export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsSchema>;

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(120),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const uploadAvatarResponseSchema = z.object({
  imageUrl: z.string().url(),
});
export type UploadAvatarResponse = z.infer<typeof uploadAvatarResponseSchema>;

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
