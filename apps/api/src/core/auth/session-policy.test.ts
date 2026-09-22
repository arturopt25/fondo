import { describe, expect, it } from "vitest";

import {
  isWithinAbsoluteSessionLifetime,
  sessionPolicy,
} from "./session-policy.js";

const dayMs = 24 * 60 * 60 * 1000;

describe("sessionPolicy", () => {
  it("keeps a session within the absolute lifetime", () => {
    const now = new Date("2026-09-22T12:00:00Z");

    expect(
      isWithinAbsoluteSessionLifetime(
        new Date(now.getTime() - 29 * dayMs),
        now,
      ),
    ).toBe(true);
  });

  it("rejects a session at the absolute lifetime boundary", () => {
    const now = new Date("2026-09-22T12:00:00Z");

    expect(
      isWithinAbsoluteSessionLifetime(
        new Date(now.getTime() - sessionPolicy.absoluteMaxLifetime * 1000),
        now,
      ),
    ).toBe(false);
  });

  it("rejects a session older than the absolute lifetime", () => {
    const now = new Date("2026-09-22T12:00:00Z");

    expect(
      isWithinAbsoluteSessionLifetime(
        new Date(now.getTime() - 31 * dayMs),
        now,
      ),
    ).toBe(false);
  });

  it("rejects an invalid createdAt value", () => {
    expect(isWithinAbsoluteSessionLifetime("not-a-date")).toBe(false);
  });
});