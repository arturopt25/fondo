import { NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MeService } from "../../../core/me/me.service.js";
import type {
  CurrentUser,
  TenantContext,
} from "../../../core/tenant/tenant-context.js";

const currentUser: CurrentUser = {
  id: "user-1",
  name: "Arturo",
  email: "arturo@example.com",
  image: null,
};

const tenant: TenantContext = {
  userId: "user-1",
  tenantId: "tenant-1",
  tenantName: "Arturo's space",
  accountingCurrency: "USD",
  timeZone: "UTC",
  role: "ADMIN",
};

function createMockPrisma() {
  const userFindUnique = vi.fn();
  const settingsFindUnique = vi.fn();
  const settingsCreate = vi.fn();
  const settingsUpdate = vi.fn();
  const userUpdate = vi.fn();

  const client = {
    user: { findUnique: userFindUnique, update: userUpdate },
    userSettings: {
      findUnique: settingsFindUnique,
      create: settingsCreate,
      update: settingsUpdate,
    },
  };
  const prisma = {
    client,
    withUserContext: vi.fn(),
    withTenantContext: vi.fn(),
  };

  return {
    client,
    prisma,
    fns: {
      userFindUnique,
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
    getSignedDownloadUrlOrNull: vi.fn(
      async (key: string) => `https://signed.test/${key}`,
    ),
  };
}

function settings(overrides: Record<string, unknown> = {}) {
  return {
    id: "settings-1",
    userId: "user-1",
    locale: "es",
    theme: "dark",
    displayCurrency: "USD",
    timeZone: "UTC",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
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
      ...currentUser,
      settings: settings(),
    });
    const service = new MeService(prisma as never, storage as never);

    const result = await service.getMe(currentUser, tenant);

    expect(result.user.email).toBe("arturo@example.com");
    expect(result.tenant.id).toBe("tenant-1");
    expect(result.membership.role).toBe("ADMIN");
    expect(result.settings.locale).toBe("es");
    expect(prisma.withUserContext).not.toHaveBeenCalled();
    expect(prisma.withTenantContext).not.toHaveBeenCalled();
  });

  it("creates settings when the user has none", async () => {
    const { prisma, fns } = createMockPrisma();
    const storage = createMockStorage();
    fns.userFindUnique.mockResolvedValue({ ...currentUser, settings: null });
    fns.settingsFindUnique.mockResolvedValue(null);
    fns.settingsCreate.mockResolvedValue(settings());
    const service = new MeService(prisma as never, storage as never);

    const result = await service.getMe(currentUser, tenant);

    expect(fns.settingsCreate).toHaveBeenCalledWith({
      data: { userId: "user-1" },
    });
    expect(result.settings.locale).toBe("es");
  });

  it("throws when the user does not exist", async () => {
    const { prisma, fns } = createMockPrisma();
    const storage = createMockStorage();
    fns.userFindUnique.mockResolvedValue(null);
    const service = new MeService(prisma as never, storage as never);

    await expect(service.getMe(currentUser, tenant)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("coerces unknown setting values to safe defaults", async () => {
    const { prisma, fns } = createMockPrisma();
    const storage = createMockStorage();
    fns.userFindUnique.mockResolvedValue({
      ...currentUser,
      settings: settings({
        locale: "fr",
        theme: "weird",
        displayCurrency: "GBP",
      }),
    });
    const service = new MeService(prisma as never, storage as never);

    const result = await service.getMe(currentUser, tenant);

    expect(result.settings.locale).toBe("es");
    expect(result.settings.theme).toBe("dark");
    expect(result.settings.displayCurrency).toBe("USD");
  });

  it("signs only Fondo avatar keys and preserves external image URLs", async () => {
    const { prisma, fns } = createMockPrisma();
    const storage = createMockStorage();
    fns.userFindUnique.mockResolvedValue({
      ...currentUser,
      image: "https://social.example/avatar.png",
      settings: settings(),
    });
    const service = new MeService(prisma as never, storage as never);

    const external = await service.getMe(currentUser, tenant);

    expect(external.user.image).toBe("https://social.example/avatar.png");
    expect(storage.getSignedDownloadUrlOrNull).not.toHaveBeenCalled();

    fns.userFindUnique.mockResolvedValue({
      ...currentUser,
      image: "avatars/user-1/avatar.png",
      settings: settings(),
    });

    const local = await service.getMe(currentUser, tenant);

    expect(local.user.image).toBe(
      "https://signed.test/avatars/user-1/avatar.png",
    );
  });
});
