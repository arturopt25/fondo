import { describe, expect, it } from "vitest";

import { localeSchema, themeSchema } from "./index.js";
import { timeZoneSchema } from "./timezone.js";

describe("shared schemas", () => {
  it("accepts only supported locales and themes", () => {
    expect(localeSchema.safeParse("es").success).toBe(true);
    expect(localeSchema.safeParse("fr").success).toBe(false);
    expect(themeSchema.safeParse("system").success).toBe(true);
    expect(themeSchema.safeParse("auto").success).toBe(false);
  });

  it("accepts only IANA time zones", () => {
    expect(timeZoneSchema.safeParse("UTC").success).toBe(true);
    expect(timeZoneSchema.safeParse("America/New_York").success).toBe(true);
    expect(timeZoneSchema.safeParse("Europe/Madrid").success).toBe(true);
    expect(timeZoneSchema.safeParse("Not/AZone").success).toBe(false);
    expect(timeZoneSchema.safeParse("").success).toBe(false);
  });
});
