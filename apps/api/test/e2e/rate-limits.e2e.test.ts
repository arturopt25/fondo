import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let app: NestFastifyApplication;
let httpServer: ReturnType<NestFastifyApplication["getHttpServer"]>;

beforeAll(async () => {
  process.env.API_WRITE_RATE_LIMIT = "2";
  const { createTestApp } = await import("./app.js");
  app = await createTestApp();
  httpServer = app.getHttpServer();
});

afterAll(async () => {
  await app.close();
});

describe("API rate limits", () => {
  it("limits mutation requests per client", async () => {
    const responses = await Promise.all(
      Array.from({ length: 3 }, () =>
        request(httpServer).post("/api/v1/accounts").send({}),
      ),
    );

    expect(responses[0]?.status).not.toBe(429);
    expect(responses[1]?.status).not.toBe(429);
    expect(responses[2]?.status).toBe(429);
  });
});
