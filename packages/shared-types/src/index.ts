import { z } from "zod";

export const supportedLocales = ["es", "en"] as const;
export const supportedThemes = ["light", "dark", "system"] as const;

export const localeSchema = z.enum(supportedLocales);
export const themeSchema = z.enum(supportedThemes);

export type SupportedLocale = z.infer<typeof localeSchema>;
export type SupportedTheme = z.infer<typeof themeSchema>;

export interface HealthResponse {
  readonly status: "ok";
  readonly service: "api";
}
