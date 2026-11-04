import { beforeEach, describe, expect, it, vi } from "vitest";

import { DatabaseHealthIndicator } from "../../../core/health/database-health.indicator.js";

function createIndicator(query: () => Promise<unknown>) {
  const up = vi.fn().mockReturnValue({ database: { status: "up" } });
  const down = vi.fn().mockImplementation((data?: unknown) => ({
    database: {
      status: "down",
      ...(typeof data === "string" ? { message: data } : {}),
    },
  }));
  const healthIndicator = {
    check: vi.fn().mockReturnValue({ up, down }),
  };
  const queryRaw = vi.fn(query);
  const prisma = {
    client: { $queryRawUnsafe: queryRaw },
  };
  const logger = { warn: vi.fn() };

  const indicator = new DatabaseHealthIndicator(
    healthIndicator as never,
    prisma as never,
    logger as never,
  );

  return { indicator, healthIndicator, queryRaw, logger, up, down };
}

describe("DatabaseHealthIndicator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports up after a successful SELECT 1", async () => {
    const { indicator, queryRaw, up } = createIndicator(async () => [
      { "?column?": 1 },
    ]);

    await expect(indicator.check(8000)).resolves.toEqual({
      database: { status: "up" },
    });
    expect(queryRaw).toHaveBeenCalledWith("SELECT 1");
    expect(up).toHaveBeenCalledTimes(1);
  });

  it("logs the sanitized underlying error and reports down", async () => {
    const error = Object.assign(
      new Error(
        "Can't reach database server at postgresql://fondo_app:secret@db.example:5432/neondb",
      ),
      { code: "P1001" },
    );
    const { indicator, logger, down } = createIndicator(async () => {
      throw error;
    });

    await expect(indicator.check(8000)).resolves.toEqual({
      database: { status: "down" },
    });

    expect(logger.warn).toHaveBeenCalledTimes(1);
    const call = logger.warn.mock.calls.at(0);
    if (!call) {
      throw new Error("expected a warning call");
    }
    const [payload, message] = call;
    expect(message).toBe("database health check failed");
    expect(payload).toMatchObject({
      errorName: "Error",
      errorCode: "P1001",
    });
    expect(payload.errorMessage).not.toContain("secret");
    expect(payload.errorMessage).not.toContain("postgresql://");
    expect(down).toHaveBeenCalledTimes(1);
  });

  it("reports the configured timeout when the query does not resolve", async () => {
    const { indicator, logger, down } = createIndicator(
      () => new Promise(() => undefined),
    );

    await expect(indicator.check(10)).resolves.toEqual({
      database: { status: "down", message: "timeout of 10ms exceeded" },
    });
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(down).toHaveBeenCalledWith("timeout of 10ms exceeded");
  });
});
