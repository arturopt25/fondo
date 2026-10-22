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
    const response = await request(httpServer)
      .get("/api/v1/health")
      .expect(200);

    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(response.headers["x-download-options"]).toBe("noopen");
    expect(response.headers["cross-origin-resource-policy"]).toBe(
      "cross-origin",
    );
  });

  it("returns a valid request id and accepts only UUID request ids", async () => {
    const suppliedRequestId = "123e4567-e89b-12d3-a456-426614174000";
    const supplied = await request(httpServer)
      .get("/api/v1/health")
      .set("X-Request-Id", suppliedRequestId)
      .expect(200);

    expect(supplied.headers["x-request-id"]).toBe(suppliedRequestId);

    const generated = await request(httpServer)
      .get("/api/v1/health")
      .set("X-Request-Id", "not-a-uuid")
      .expect(200);

    expect(generated.headers["x-request-id"]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(generated.headers["x-request-id"]).not.toBe("not-a-uuid");
  });

  it("only exposes CORS headers to configured origins", async () => {
    const allowed = await request(httpServer)
      .options("/api/v1/health")
      .set("Origin", "http://localhost:5173")
      .set("Access-Control-Request-Method", "GET")
      .expect(204);

    expect(allowed.headers["access-control-allow-origin"]).toBe(
      "http://localhost:5173",
    );

    const denied = await request(httpServer)
      .options("/api/v1/health")
      .set("Origin", "https://evil.example.com")
      .set("Access-Control-Request-Method", "GET")
      .expect(204);

    expect(denied.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("uses the same CORS allowlist for Better Auth", async () => {
    const allowed = await request(httpServer)
      .options("/api/v1/auth/session")
      .set("Origin", "http://localhost:5173")
      .set("Access-Control-Request-Method", "GET")
      .expect(204);

    expect(allowed.headers["access-control-allow-origin"]).toBe(
      "http://localhost:5173",
    );

    const denied = await request(httpServer)
      .options("/api/v1/auth/session")
      .set("Origin", "https://evil.example.com")
      .set("Access-Control-Request-Method", "GET")
      .expect(204);

    expect(denied.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("rejects payloads larger than the configured body limit", async () => {
    const oversized = { note: "x".repeat(1_200_000) };

    const response = await request(httpServer)
      .post("/api/v1/transactions/expense")
      .send(oversized);

    expect(response.status).toBe(413);
  });
});
