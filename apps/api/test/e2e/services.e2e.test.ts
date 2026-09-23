import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { prisma } from "@fondo/db";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createTestApp } from "./app.js";

let app: NestFastifyApplication;
let httpServer: ReturnType<NestFastifyApplication["getHttpServer"]>;

function uniqueEmail(): string {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `e2e-services-${suffix}@example.com`;
}

async function truncateAll(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "user", "session", "account", "verification", "Tenant", "Membership", "UserSettings", "ServiceDefinition", "ServiceSubscription", "ServiceCapabilityDefinition", "ServiceCapabilitySelection", "AuditLog" RESTART IDENTITY CASCADE',
  );
}

async function signUp(
  email: string,
): Promise<ReturnType<typeof request.agent>> {
  const agent = request.agent(httpServer);
  await agent
    .post("/api/v1/auth/sign-up/email")
    .send({ name: "E2E User", email, password: "password123" })
    .expect(200);
  return agent;
}

beforeAll(async () => {
  app = await createTestApp();
  httpServer = app.getHttpServer();
});

beforeEach(async () => {
  await truncateAll();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "ServiceDefinition" ("id", "key", "name", "description", "createdAt", "updatedAt") VALUES
      (gen_random_uuid(), 'PERSONAL_FINANCE', 'Personal Finance', 'PF', now(), now()),
      (gen_random_uuid(), 'VEHICLE', 'Vehicle', 'V', now(), now()),
      (gen_random_uuid(), 'HOME', 'Home', 'H', now(), now()),
      (gen_random_uuid(), 'INSURANCE', 'Insurance', 'I', now(), now()),
      (gen_random_uuid(), 'ENTREPRENEURSHIP', 'Entrepreneurship', 'E', now(), now());`,
  );
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

describe("services e2e", () => {
  it("activates Personal Finance by default for a new tenant", async () => {
    const agent = await signUp(uniqueEmail());

    const catalog = await agent.get("/api/v1/services").expect(200);
    const personalFinance = catalog.body.services.find(
      (service: { key: string }) => service.key === "PERSONAL_FINANCE",
    );
    expect(personalFinance.status).toBe("ACTIVE");
    expect(
      catalog.body.services.some(
        (service: { key: string; status: string }) =>
          service.key === "VEHICLE" && service.status === "DISABLED",
      ),
    ).toBe(true);

    const active = await agent.get("/api/v1/services/me").expect(200);
    expect(active.body.active).toEqual(["PERSONAL_FINANCE"]);
  });

  it("allows an ADMIN to disable and re-enable a service", async () => {
    const agent = await signUp(uniqueEmail());

    await agent.post("/api/v1/services/VEHICLE/disable").expect(201);

    const disabledCatalog = await agent.get("/api/v1/services").expect(200);
    const vehicle = disabledCatalog.body.services.find(
      (service: { key: string }) => service.key === "VEHICLE",
    );
    expect(vehicle.status).toBe("DISABLED");

    await agent.post("/api/v1/services/VEHICLE/enable").expect(201);
    const enabledCatalog = await agent.get("/api/v1/services").expect(200);
    const vehicleEnabled = enabledCatalog.body.services.find(
      (service: { key: string }) => service.key === "VEHICLE",
    );
    expect(vehicleEnabled.status).toBe("ACTIVE");

    const auditCount = await prisma.auditLog.count({
      where: { action: "SERVICE_CONFIGURED", resource: "service:VEHICLE" },
    });
    expect(auditCount).toBe(1);
  });

  it("rejects a MEMBER from changing service status", async () => {
    const email = uniqueEmail();
    const agent = await signUp(email);

    await prisma.membership.updateMany({
      where: { user: { email } },
      data: { role: "MEMBER" },
    });

    await agent.post("/api/v1/services/VEHICLE/disable").expect(403);
  });

  it("rejects an unknown service key", async () => {
    const agent = await signUp(uniqueEmail());

    await agent.post("/api/v1/services/UNKNOWN/disable").expect(400);
  });
});
