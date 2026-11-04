import { afterEach, describe, expect, it, vi } from "vitest";

import { HealthController } from "../../../core/health/health.controller.js";

afterEach(() => {
  delete process.env.HEALTH_DB_TIMEOUT_MS;
});

function createController(timeoutFromEnv?: string) {
  if (timeoutFromEnv === undefined) {
    delete process.env.HEALTH_DB_TIMEOUT_MS;
  } else {
    process.env.HEALTH_DB_TIMEOUT_MS = timeoutFromEnv;
  }

  const check = vi.fn().mockResolvedValue({
    status: "ok",
    details: { database: { status: "up" } },
  });
  const databaseCheck = vi.fn().mockResolvedValue({
    database: { status: "up" },
  });

  const controller = new HealthController(
    { check } as never,
    { check: databaseCheck } as never,
  );

  return { controller, check, databaseCheck };
}

describe("HealthController", () => {
  it("passes the configured timeout to the database indicator", async () => {
    const { controller, check, databaseCheck } =
      createController("8000");

    const result = await controller.check();

    expect(result.status).toBe("ok");
    expect(check).toHaveBeenCalledTimes(1);
    const indicator = check.mock.calls[0]?.[0]?.[0] as
      | (() => Promise<unknown>)
      | undefined;
    if (!indicator) {
      throw new Error("expected a health check callback");
    }
    await indicator();
    expect(databaseCheck).toHaveBeenCalledWith(8000);
  });

  it("uses the default timeout when the variable is absent", async () => {
    const { controller, check, databaseCheck } = createController();

    await controller.check();
    const indicator = check.mock.calls[0]?.[0]?.[0] as
      | (() => Promise<unknown>)
      | undefined;
    if (!indicator) {
      throw new Error("expected a health check callback");
    }
    await indicator();
    expect(databaseCheck).toHaveBeenCalledWith(1000);
  });

  it("liveness never touches the database", () => {
    const { controller, check, databaseCheck } = createController();

    expect(controller.live()).toEqual({ status: "ok" });
    expect(check).not.toHaveBeenCalled();
    expect(databaseCheck).not.toHaveBeenCalled();
  });

  it("readiness uses the configured timeout", async () => {
    const { controller, check, databaseCheck } = createController("2500");

    await controller.ready();
    const indicator = check.mock.calls[0]?.[0]?.[0] as
      | (() => Promise<unknown>)
      | undefined;
    if (!indicator) {
      throw new Error("expected a health check callback");
    }
    await indicator();
    expect(databaseCheck).toHaveBeenCalledWith(2500);
  });
});
