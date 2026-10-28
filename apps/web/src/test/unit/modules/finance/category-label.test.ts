import { describe, expect, it } from "vitest";
import type { TFunction } from "i18next";

import es from "../../../../locales/es/translation.json";
import { categoryLabel } from "../../../../modules/finance/category-label";

const translate = ((key: string, options?: { defaultValue?: string }) => {
  let value: unknown = es;

  for (const segment of key.split(".")) {
    if (typeof value !== "object" || value === null) {
      return options?.defaultValue ?? key;
    }
    value = (value as Record<string, unknown>)[segment];
  }

  return typeof value === "string" ? value : options?.defaultValue ?? key;
}) as unknown as TFunction;

describe("categoryLabel", () => {
  it("translates default category names and preserves custom names", () => {
    expect(categoryLabel("Food", translate)).toBe("Alimentación");
    expect(categoryLabel("Housing", translate)).toBe("Vivienda");
    expect(categoryLabel("Comida", translate)).toBe("Comida");
  });
});
