import { describe, expect, it } from "vitest";

import { clientIpTracker } from "../../../core/config/rate-limits.js";

describe("clientIpTracker", () => {
  it("prefers the single Cloudflare client IP header", () => {
    expect(
      clientIpTracker({
        headers: {
          "cf-connecting-ip": "203.0.113.10",
          "x-forwarded-for": "198.51.100.1, 203.0.113.10",
        },
        ip: "10.0.0.1",
      }),
    ).toBe("203.0.113.10");
  });

  it("uses the first x-forwarded-for entry when Cloudflare is absent", () => {
    expect(
      clientIpTracker({
        headers: { "x-forwarded-for": "198.51.100.1, 10.0.0.1" },
        ip: "10.0.0.1",
      }),
    ).toBe("198.51.100.1");
  });

  it("falls back to the socket IP", () => {
    expect(clientIpTracker({ headers: {}, ip: "10.0.0.1" })).toBe("10.0.0.1");
  });

  it("returns a stable fallback when no IP is available", () => {
    expect(clientIpTracker({ headers: {} })).toBe("unknown");
  });
});
