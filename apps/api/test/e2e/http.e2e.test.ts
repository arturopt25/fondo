import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestApp } from "./app.js";

let app: NestFastifyApplication;
let httpServer: ReturnType<NestFastifyApplication["getHttpServer"]>;

beforeAll(async () => {
  app = await createTestApp();
  httpServer = app.getHttpServer();
});

afterAll(async () => {
  await app.close();
});

describe("http hardening", () => {
  it("sends security headers on every response", async () => {
    const response = await request(httpServer).get("/api/v1/health").expect(200);

    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(response.headers["x-download-options"]).toBe("noopen");
    expect(response.headers["cross-origin-resource-policy"]).toBe(
      "cross-origin",
    );
  });

  it("rejects payloads larger than the configured body limit", async () => {
    const oversized = { note: "x".repeat(1_200_000) };

    const response = await request(httpServer)
      .post("/api/v1/transactions/expense")
      .send(oversized);

    expect(response.status).toBe(413);
  });
});