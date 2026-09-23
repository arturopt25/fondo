import { describe, expect, it } from "vitest";

import en from "../../../locales/en/translation.json";
import es from "../../../locales/es/translation.json";

describe("translations", () => {
  it("keeps the English and Spanish translation trees equivalent", () => {
    expect(leafKeys(es)).toEqual(leafKeys(en));
  });
});

function leafKeys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return [prefix];
  }

  return Object.entries(value)
    .flatMap(([key, child]) =>
      leafKeys(child, prefix ? `${prefix}.${key}` : key),
    )
    .sort();
}
