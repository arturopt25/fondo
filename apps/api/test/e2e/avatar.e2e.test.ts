import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { adminPrisma } from "./admin-prisma.js";
import { createTestApp } from "./app.js";
import { FakeStorageService } from "./fake-storage.js";

let app: NestFastifyApplication;
let httpServer: ReturnType<NestFastifyApplication["getHttpServer"]>;
const storage = new FakeStorageService();

function uniqueEmail(): string {
  return `e2e-avatar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

async function truncateAll(): Promise<void> {
  await adminPrisma.$executeRawUnsafe(
    'TRUNCATE "user", "session", "account", "verification", "Tenant", "Membership", "UserSettings" RESTART IDENTITY CASCADE',
  );
}

async function signUp(): Promise<ReturnType<typeof request.agent>> {
  const agent = request.agent(httpServer);
  await agent
    .post("/api/v1/auth/sign-up/email")
    .send({ name: "Avatar User", email: uniqueEmail(), password: "password123" })
    .expect(200);
  return agent;
}

beforeAll(async () => {
  app = await createTestApp(storage as never);
  httpServer = app.getHttpServer();
});

beforeEach(async () => {
  storage.clear();
  await truncateAll();
});

afterAll(async () => {
  await adminPrisma.$disconnect();
  await app.close();
});

describe("avatar e2e", () => {
  it("uploads an avatar and returns a presigned URL from me", async () => {
    const agent = await signUp();

    await agent
      .post("/api/v1/me/avatar")
      .attach("file", png, { filename: "avatar.png", contentType: "image/png" })
      .expect(201);

    const me = await agent.get("/api/v1/me").expect(200);
    expect(me.body.user.image).toMatch(/^https:\/\/fake-storage\.local\//);
    expect(storage.objects.size).toBe(1);
  });

  it("rejects invalid magic bytes and profile image updates", async () => {
    const agent = await signUp();

    await agent
      .post("/api/v1/me/avatar")
      .attach("file", Buffer.from("not an image"), {
        filename: "avatar.png",
        contentType: "image/png",
      })
      .expect(400);

    const before = await adminPrisma.user.findFirstOrThrow();
    await agent
      .patch("/api/v1/me/profile")
      .send({ name: "Updated", image: "https://external.example/avatar.png" })
      .expect(400);
    const after = await adminPrisma.user.findUniqueOrThrow({
      where: { id: before.id },
    });
    expect(after.image).toBe(before.image);
  });

  it("returns 413 when the avatar exceeds the limit", async () => {
    const agent = await signUp();
    const oversized = Buffer.concat([png, Buffer.alloc(storage.avatarMaxFileSizeBytes)]);

    const response = await agent
      .post("/api/v1/me/avatar")
      .attach("file", oversized, {
        filename: "large.png",
        contentType: "image/png",
      });

    expect(response.status).toBe(413);
    expect(response.body.error.message).toContain("maximum allowed size");
  });
});
