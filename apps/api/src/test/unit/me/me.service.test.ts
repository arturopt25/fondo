import { NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MeService } from "../../../core/me/me.service.js";

function createMockPrisma() {
  const userFindUnique = vi.fn();
  const membershipFindFirst = vi.fn();
  const tenantFindUnique = vi.fn();
  const settingsFindUnique = vi.fn();
  const settingsCreate = vi.fn();
  const settingsUpdate = vi.fn();
  const userUpdate = vi.fn();

  const client = {
    user: { findUnique: userFindUnique, update: userUpdate },
    membership: { findFirst: membershipFindFirst },
    tenant: { findUnique: tenantFindUnique },
    userSettings: {
      findUnique: settingsFindUnique,
      create: settingsCreate,
      update: settingsUpdate,
    },
  };
  const prisma = {
    client,
    withUserContext: vi.fn(async (_userId, cb) => cb(client)),
    withTenantContext: vi.fn(async (_ctx, cb) => cb(client)),
  };

  return {
    client,
    prisma,
    fns: {
      userFindUnique,
      membershipFindFirst,
      tenantFindUnique,
      settingsFindUnique,
      settingsCreate,
      settingsUpdate,
      userUpdate,
    },
  };
}

function createMockStorage() {
  return {
    avatarMaxFileSizeBytes: 2 * 1024 * 1024,
    validateFile: vi.fn(),
    generateKey: vi.fn(),
    upload: vi.fn(),
    delete: vi.fn(),
    getSignedDownloadUrl: vi.fn(async (key: string) => `https://signed.test/${key}`),
  };
}

describe("MeService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the user with their tenant, role and settings", async () => {
    const { prisma, fns } = createMockPrisma();
    const storage = createMockStorage();
    fns.userFindUnique.mockResolvedValue({
      id: "user-1",
      name: "Arturo",
      email: "arturo@example.com",
      image: null,
    });
    fns.membershipFindFirst.mockResolvedValue({
      role: "ADMIN",
      tenantId: "tenant-1",
    });
    fns.tenantFindUnique.mockResolvedValue({
      id: "tenant-1",
      name: "Arturo's space",
      accountingCurrency: "USD",
      timeZone: "UTC",
    });
    fns.settingsFindUnique.mockResolvedValue({
      id: "settings-1",
      locale: "es",
      theme: "dark",
      displayCurrency: "USD",
      timeZone: "UTC",
    });
    const service = new MeService(prisma as never, storage as never);

    const result = await service.getMe("user-1");

    expect(result.user.email).toBe("arturo@example.com");
    expect(result.tenant.id).toBe("tenant-1");
    expect(result.membership.role).toBe("ADMIN");
    expect(result.settings.locale).toBe("es");
  });

  it("throws when the user does not exist", async () => {
    const { prisma, fns } = createMockPrisma();
    const storage = createMockStorage();
    fns.userFindUnique.mockResolvedValue(null);
    const service = new MeService(prisma as never, storage as never);

    await expect(service.getMe("missing")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("throws when the user has no membership", async () => {
    const { prisma, fns } = createMockPrisma();
    const storage = createMockStorage();
    fns.userFindUnique.mockResolvedValue({
      id: "user-1",
      name: "A",
      email: "a@b.c",
      image: null,
    });
    fns.membershipFindFirst.mockResolvedValue(null);
    const service = new MeService(prisma as never, storage as never);

    await expect(service.getMe("user-1")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("coerces unknown setting values to safe defaults", async () => {
    const { prisma, fns } = createMockPrisma();
    const storage = createMockStorage();
    fns.userFindUnique.mockResolvedValue({
      id: "user-1",
      name: "A",
      email: "a@b.c",
      image: null,
    });
    fns.membershipFindFirst.mockResolvedValue({
      role: "MEMBER",
      tenantId: "tenant-1",
    });
    fns.tenantFindUnique.mockResolvedValue({
      id: "tenant-1",
      name: "S",
      accountingCurrency: "EUR",
      timeZone: "UTC",
    });
    fns.settingsFindUnique.mockResolvedValue({
      id: "settings-1",
      locale: "fr",
      theme: "weird",
      displayCurrency: "GBP",
      timeZone: "UTC",
    });
    const service = new MeService(prisma as never, storage as never);

    const result = await service.getMe("user-1");

    expect(result.settings.locale).toBe("es");
    expect(result.settings.theme).toBe("dark");
    expect(result.settings.displayCurrency).toBe("USD");
  });

  it("signs only Fondo avatar keys and preserves external image URLs", async () => {
    const { prisma, fns } = createMockPrisma();
    const storage = createMockStorage();
    fns.membershipFindFirst.mockResolvedValue({
      role: "MEMBER",
      tenantId: "tenant-1",
    });
    fns.tenantFindUnique.mockResolvedValue({
      id: "tenant-1",
      name: "Space",
      accountingCurrency: "USD",
      timeZone: "UTC",
    });
    fns.settingsFindUnique.mockResolvedValue({
      id: "settings-1",
      locale: "es",
      theme: "dark",
      displayCurrency: "USD",
      timeZone: "UTC",
    });
    fns.userFindUnique.mockResolvedValue({
      id: "user-1",
      name: "A",
      email: "a@b.c",
      image: "https://social.example/avatar.png",
    });
    const service = new MeService(prisma as never, storage as never);

    const external = await service.getMe("user-1");

    expect(external.user.image).toBe("https://social.example/avatar.png");
    expect(storage.getSignedDownloadUrl).not.toHaveBeenCalled();

    fns.userFindUnique.mockResolvedValue({
      id: "user-1",
      name: "A",
      email: "a@b.c",
      image: "avatars/user-1/avatar.png",
    });

    const local = await service.getMe("user-1");

    expect(local.user.image).toBe(
      "https://signed.test/avatars/user-1/avatar.png",
    );
  });
});
