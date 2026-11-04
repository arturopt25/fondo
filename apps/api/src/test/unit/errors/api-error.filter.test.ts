import { NotFoundException, type ArgumentsHost } from "@nestjs/common";
import { Prisma } from "@fondo/db";
import { describe, expect, it, vi } from "vitest";

import { ApiErrorFilter } from "../../../core/errors/api-error.filter.js";

function createHarness() {
  const response = {
    headers: {} as Record<string, string>,
    statusCode: 0,
    body: undefined as unknown,
    header(name: string, value: string) {
      this.headers[name] = value;
      return this;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    send(body: unknown) {
      this.body = body;
      return this;
    },
  };
  const request = {
    id: "req-1",
    method: "GET",
    url: "/api/v1/me?x=1",
    tenant: { tenantId: "tenant-1" },
    user: { id: "user-1" },
    timings: { authMs: 1, contextMs: 2, guardMs: 3, handlerMs: 4 },
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;
  const logger = { error: vi.fn(), warn: vi.fn() };
  const filter = new ApiErrorFilter(logger as never);
  return { filter, response, logger, host };
}

describe("ApiErrorFilter", () => {
  it("maps a transient Prisma error to 503 with request id and Retry-After", () => {
    const { filter, response, logger, host } = createHarness();
    const error = new Prisma.PrismaClientKnownRequestError(
      "Transaction API error: Transaction not found",
      {
        code: "P2028",
        clientVersion: "6.19.3",
        meta: { error: "Transaction not found" },
      },
    );

    filter.catch(error, host);

    expect(response.statusCode).toBe(503);
    expect(response.headers["Retry-After"]).toBe("5");
    expect(response.headers["X-Request-Id"]).toBe("req-1");
    expect(response.body).toMatchObject({
      error: {
        code: "DATABASE_UNAVAILABLE",
        requestId: "req-1",
      },
    });
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: "req-1",
        timings: { authMs: 1, contextMs: 2, guardMs: 3, handlerMs: 4 },
      }),
      "request failed",
    );
  });

  it("keeps non-transient HTTP errors unchanged", () => {
    const { filter, response, host } = createHarness();

    filter.catch(new NotFoundException("No personal space found"), host);

    expect(response.statusCode).toBe(404);
    expect(response.headers["Retry-After"]).toBeUndefined();
    expect(response.body).toMatchObject({
      error: { code: "NOT_FOUND", requestId: "req-1" },
    });
  });
});
