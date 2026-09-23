import { describe, expect, it, vi } from "vitest";

import { HealthController } from "../../../core/health/health.controller.js";

describe("HealthController", () => {
  it("reports the database health through Terminus", async () => {
    const check = vi.fn().mockResolvedValue({
      status: "ok",
      details: { database: { status: "up" } },
    });
    const database = { pingCheck: vi.fn() };
    const prisma = { client: {} };

    const controller = new HealthController(
      { check } as never,
      database as never,
      prisma as never,
    );

    const result = await controller.check();

    expect(result.status).toBe("ok");
    expect(check).toHaveBeenCalledTimes(1);
  });
});