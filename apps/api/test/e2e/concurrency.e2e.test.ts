import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { adminPrisma } from "./admin-prisma.js";
import { createTestApp } from "./app.js";

let app: NestFastifyApplication;
let httpServer: ReturnType<NestFastifyApplication["getHttpServer"]>;

function uniqueEmail(): string {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `concurrency-${suffix}@example.com`;
}

function cookieHeader(setCookie: string | string[] | undefined): string {
  if (!setCookie) return "";
  const values = Array.isArray(setCookie) ? setCookie : [setCookie];
  return values.map((value) => value.split(";")[0]).join("; ");
}

beforeAll(async () => {
  app = await createTestApp();
  httpServer = app.getHttpServer();
});

afterAll(async () => {
  await adminPrisma.$disconnect();
  await app.close();
});

describe("concurrent authenticated requests", () => {
  it("serves four parallel dashboard requests without P2028", async () => {
    const signUp = await request(httpServer)
      .post("/api/v1/auth/sign-up/email")
      .send({
        name: "Concurrency User",
        email: uniqueEmail(),
        password: "password123",
      })
      .expect(200);

    const cookie = cookieHeader(signUp.headers["set-cookie"]);
    expect(cookie.length).toBeGreaterThan(0);

    const endpoints = [
      "/api/v1/me",
      "/api/v1/me/settings",
      "/api/v1/accounts",
      "/api/v1/services",
    ];

    const startedAt = performance.now();
    const responses = await Promise.all(
      endpoints.map((path) =>
        request(httpServer).get(path).set("Cookie", cookie),
      ),
    );
    const elapsedMs = performance.now() - startedAt;

    for (const [index, response] of responses.entries()) {
      expect(
        response.status,
        `${endpoints[index]} -> ${response.status} ${JSON.stringify(response.body)}`,
      ).toBe(200);
      expect(JSON.stringify(response.body)).not.toContain("P2028");
    }

    // Keep the measurement visible in CI logs without making it a hard timing
    // assertion that would be flaky on shared runners.
    console.log(`4 parallel authenticated requests: ${elapsedMs.toFixed(0)}ms`);
  });
});
