import { describe, expect, it } from "vitest";

import { localeSchema, themeSchema } from "./index.js";

describe("shared schemas", () => {
  it("accepts only supported locales and themes", () => {
    expect(localeSchema.safeParse("es").success).toBe(true);
    expect(localeSchema.safeParse("fr").success).toBe(false);
    expect(themeSchema.safeParse("system").success).toBe(true);
    expect(themeSchema.safeParse("auto").success).toBe(false);
  });
});
