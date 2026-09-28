import { describe, expect, it } from "vitest";

import {
  convertMinor,
  formatMinorAmount,
  rateFor,
} from "../../../lib/money";

const rate = {
  from: "USD",
  to: "EUR",
  rate: 0.92,
  effectiveAt: "2026-09-01T00:00:00.000Z",
  source: "configured",
};

describe("money helpers", () => {
  it("converts USD minor units to the display currency when a rate exists", () => {
    expect(convertMinor(10_000, null)).toBe(10_000);
    expect(convertMinor(10_000, undefined)).toBe(10_000);
    expect(convertMinor(10_000, rate)).toBe(9_200);
  });

  it("only applies a rate that matches the display currency", () => {
    expect(rateFor(rate, "EUR")).toEqual(rate);
    expect(rateFor(rate, "USD")).toBeNull();
    expect(rateFor(null, "EUR")).toBeNull();
  });

  it("formats amounts with the selected currency", () => {
    expect(formatMinorAmount(1_000, "USD", null, "en-US")).toBe("$10");
    expect(formatMinorAmount(10_000, "EUR", rate, "es-ES")).toBe("92\u00a0€");
  });
  it("does not convert USD amounts when a USD-to-EUR rate is configured", () => {
    expect(formatMinorAmount(10_000, "USD", rate, "en-US")).toBe("$100");
  });
});

