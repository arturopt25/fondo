import { describe, expect, it } from "vitest";

import {
  DEFAULT_HEALTH_DB_TIMEOUT_MS,
  parseHealthDbTimeoutMs,
} from "../../../core/health/health.config.js";

describe("parseHealthDbTimeoutMs", () => {
  it("defaults to 1000ms when the variable is absent or blank", () => {
    expect(parseHealthDbTimeoutMs(undefined)).toBe(
      DEFAULT_HEALTH_DB_TIMEOUT_MS,
    );
    expect(parseHealthDbTimeoutMs("")).toBe(DEFAULT_HEALTH_DB_TIMEOUT_MS);
    expect(parseHealthDbTimeoutMs("   ")).toBe(DEFAULT_HEALTH_DB_TIMEOUT_MS);
  });

  it("parses a positive integer", () => {
    expect(parseHealthDbTimeoutMs("8000")).toBe(8000);
  });

  it.each(["0", "-1", "1.5", "abc"])(
    "falls back to the default for invalid value %s",
    (raw) => {
      expect(parseHealthDbTimeoutMs(raw)).toBe(DEFAULT_HEALTH_DB_TIMEOUT_MS);
    },
  );
});
