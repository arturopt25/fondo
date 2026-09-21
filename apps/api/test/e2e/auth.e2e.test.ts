import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { prisma } from "@fondo/db";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createTestApp } from "./app.js";

type Agent = ReturnType<typeof request.agent>;

let app: NestFastifyApplication;
let httpServer: ReturnType<NestFastifyApplication["getHttpServer"]>;

function uniqueEmail(): string {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `e2e-${suffix}@example.com`;
}

async function truncateAll(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "user", "session", "account", "verification", "Tenant", "Membership", "UserSettings" RESTART IDENTITY CASCADE',
  );
}

async function signUp(agent: Agent, email: string): Promise<void> {
  await agent
    .post("/api/v1/auth/sign-up/email")
    .send({ name: "E2E User", email, password: "password123" })
    .expect(200);
}

beforeAll(async () => {
  app = await createTestApp();
  httpServer = app.getHttpServer();
});

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

describe("auth e2e", () => {
  it("provisions user, tenant, membership and settings on signup", async () => {
    const agent = request.agent(httpServer);
    const email = uniqueEmail();
    await signUp(agent, email);

    const me = await agent.get("/api/v1/me").expect(200);
    expect(me.body.user.email).toBe(email);
    expect(me.body.membership.role).toBe("ADMIN");
    expect(me.body.tenant.id).toBeTruthy();
    expect(me.body.settings.theme).toBe("dark");
    expect(me.body.settings.locale).toBe("es");

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(await prisma.tenant.count({ where: { ownerUserId: user.id } })).toBe(
      1,
    );
    expect(await prisma.membership.count({ where: { userId: user.id } })).toBe(
      1,
    );
    expect(
      await prisma.userSettings.count({ where: { userId: user.id } }),
    ).toBe(1);
  });

  it("persists settings updates and invalidates the session on logout", async () => {
    const agent = request.agent(httpServer);
    await signUp(agent, uniqueEmail());

    await agent
      .patch("/api/v1/me/settings")
      .send({
        theme: "light",
        locale: "en",
        displayCurrency: "EUR",
        timeZone: "Europe/Madrid",
      })
      .expect(200);

    const settings = await agent.get("/api/v1/me/settings").expect(200);
    expect(settings.body).toEqual({
      theme: "light",
      locale: "en",
      displayCurrency: "EUR",
      timeZone: "Europe/Madrid",
    });

    await agent.post("/api/v1/auth/sign-out").expect(200);
    await agent.get("/api/v1/me").expect(401);
  });

  it("rejects an invalid timezone with a validation error", async () => {
    const agent = request.agent(httpServer);
    await signUp(agent, uniqueEmail());

    const response = await agent
      .patch("/api/v1/me/settings")
      .send({ timeZone: "Not/AZone" })
      .expect(400);

    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("fails a duplicate signup without creating a second user", async () => {
    const email = uniqueEmail();
    await signUp(request.agent(httpServer), email);

    const duplicate = await request(httpServer)
      .post("/api/v1/auth/sign-up/email")
      .send({ name: "E2E User", email, password: "password123" });

    expect(duplicate.status).toBeGreaterThanOrEqual(400);
    expect(await prisma.user.count({ where: { email } })).toBe(1);
  });

  it("returns 404 for a user without membership", async () => {
    const agent = request.agent(httpServer);
    const email = uniqueEmail();
    await signUp(agent, email);

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    await prisma.tenant.deleteMany({ where: { ownerUserId: user.id } });
    await prisma.membership.deleteMany({ where: { userId: user.id } });

    await agent.get("/api/v1/me").expect(404);
  });

  it("returns 401 for an expired session", async () => {
    const agent = request.agent(httpServer);
    await signUp(agent, uniqueEmail());

    await prisma.session.updateMany({
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    await agent.get("/api/v1/me").expect(401);
  });

  it("sets HttpOnly session cookies and exposes CORS headers", async () => {
    const email = uniqueEmail();
    const signUpResponse = await request(httpServer)
      .post("/api/v1/auth/sign-up/email")
      .send({ name: "E2E User", email, password: "password123" })
      .expect(200);

    const setCookie = signUpResponse.headers["set-cookie"] as
      | string[]
      | undefined;
    const sessionCookie = (setCookie ?? []).find((cookie) =>
      cookie.startsWith("better-auth.session_token="),
    );
    expect(sessionCookie).toBeTruthy();
    expect(sessionCookie).toContain("HttpOnly");
    expect(sessionCookie).toContain("SameSite");

    const cors = await request(httpServer)
      .get("/api/v1/me")
      .set("Origin", "http://localhost:5173");
    expect(cors.headers["access-control-allow-origin"]).toBe(
      "http://localhost:5173",
    );
  });

  it("creates exactly one user under concurrent signups", async () => {
    const email = uniqueEmail();

    const results = await Promise.allSettled([
      request(httpServer)
        .post("/api/v1/auth/sign-up/email")
        .send({ name: "A", email, password: "password123" }),
      request(httpServer)
        .post("/api/v1/auth/sign-up/email")
        .send({ name: "B", email, password: "password123" }),
    ]);

    const succeeded = results.filter(
      (result) =>
        result.status === "fulfilled" && result.value.status === 200,
    );
    expect(succeeded.length).toBeGreaterThanOrEqual(1);
    expect(await prisma.user.count({ where: { email } })).toBe(1);
  });

  it("signs in with existing credentials", async () => {
    const agent = request.agent(httpServer);
    const email = uniqueEmail();
    await signUp(agent, email);
    await agent.post("/api/v1/auth/sign-out").expect(200);

    await agent
      .post("/api/v1/auth/sign-in/email")
      .send({ email, password: "password123" })
      .expect(200);

    await agent.get("/api/v1/me").expect(200);
  });

  it("updates the profile name", async () => {
    const agent = request.agent(httpServer);
    await signUp(agent, uniqueEmail());

    await agent
      .patch("/api/v1/me/profile")
      .send({ name: "Updated Name" })
      .expect(200);

    const me = await agent.get("/api/v1/me").expect(200);
    expect(me.body.user.name).toBe("Updated Name");
  });

  it("changes the password and signs in with the new one", async () => {
    const agent = request.agent(httpServer);
    const email = uniqueEmail();
    await signUp(agent, email);

    await agent
      .post("/api/v1/auth/change-password")
      .send({
        currentPassword: "password123",
        newPassword: "new-password-456",
        revokeOtherSessions: true,
      })
      .expect(200);

    await agent.post("/api/v1/auth/sign-out").expect(200);
    await request(httpServer)
      .post("/api/v1/auth/sign-in/email")
      .send({ email, password: "new-password-456" })
      .expect(200);
  });

  it("lists and revokes sessions", async () => {
    const agent = request.agent(httpServer);
    await signUp(agent, uniqueEmail());

    const sessions = await agent.get("/api/v1/auth/list-sessions").expect(200);
    expect(sessions.body.length).toBe(1);
    const token = sessions.body[0]?.token as string | undefined;
    expect(token).toBeTruthy();

    await agent
      .post("/api/v1/auth/revoke-session")
      .send({ token })
      .expect(200);

    await agent.get("/api/v1/me").expect(401);
  });

  it("reports database health through Terminus", async () => {
    const response = await request(httpServer).get("/api/v1/health").expect(200);

    expect(response.body.status).toBe("ok");
    expect(response.body.details.database.status).toBe("up");
  });

  it("returns 429 once the sign-in rate limit is exceeded", async () => {
    const email = uniqueEmail();

    const statuses: number[] = [];
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const response = await request(httpServer)
        .post("/api/v1/auth/sign-in/email")
        .send({ email, password: "wrong-password" });
      statuses.push(response.status);
    }

    expect(statuses).toContain(429);
  });
});