import { NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MeService } from "../../../core/me/me.service.js";

function createMockPrisma() {
  const userFindUnique = vi.fn();
  const membershipFindFirst = vi.fn();
  const settingsFindUnique = vi.fn();
  const settingsCreate = vi.fn();
  const settingsUpdate = vi.fn();
  const userUpdate = vi.fn();

  return {
    client: {
      user: { findUnique: userFindUnique, update: userUpdate },
      membership: { findFirst: membershipFindFirst },
      userSettings: {
        findUnique: settingsFindUnique,
        create: settingsCreate,
        update: settingsUpdate,
      },
    },
    fns: {
      userFindUnique,
      membershipFindFirst,
      settingsFindUnique,
      settingsCreate,
      settingsUpdate,
      userUpdate,
    },
  };
}

describe("MeService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the user with their tenant, role and settings", async () => {
    const { client, fns } = createMockPrisma();
    fns.userFindUnique.mockResolvedValue({
      id: "user-1",
      name: "Arturo",
      email: "arturo@example.com",
      image: null,
    });
    fns.membershipFindFirst.mockResolvedValue({
      role: "ADMIN",
      tenant: {
        id: "tenant-1",
        name: "Arturo's space",
        accountingCurrency: "USD",
        timeZone: "UTC",
      },
    });
    fns.settingsFindUnique.mockResolvedValue({
      id: "settings-1",
      locale: "es",
      theme: "dark",
      displayCurrency: "USD",
      timeZone: "UTC",
    });
    const service = new MeService({ client } as never);

    const result = await service.getMe("user-1");

    expect(result.user.email).toBe("arturo@example.com");
    expect(result.tenant.id).toBe("tenant-1");
    expect(result.membership.role).toBe("ADMIN");
    expect(result.settings.locale).toBe("es");
  });

  it("throws when the user does not exist", async () => {
    const { client, fns } = createMockPrisma();
    fns.userFindUnique.mockResolvedValue(null);
    const service = new MeService({ client } as never);

    await expect(service.getMe("missing")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("throws when the user has no membership", async () => {
    const { client, fns } = createMockPrisma();
    fns.userFindUnique.mockResolvedValue({
      id: "user-1",
      name: "A",
      email: "a@b.c",
      image: null,
    });
    fns.membershipFindFirst.mockResolvedValue(null);
    const service = new MeService({ client } as never);

    await expect(service.getMe("user-1")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("coerces unknown setting values to safe defaults", async () => {
    const { client, fns } = createMockPrisma();
    fns.userFindUnique.mockResolvedValue({
      id: "user-1",
      name: "A",
      email: "a@b.c",
      image: null,
    });
    fns.membershipFindFirst.mockResolvedValue({
      role: "MEMBER",
      tenant: {
        id: "tenant-1",
        name: "S",
        accountingCurrency: "EUR",
        timeZone: "UTC",
      },
    });
    fns.settingsFindUnique.mockResolvedValue({
      id: "settings-1",
      locale: "fr",
      theme: "weird",
      displayCurrency: "GBP",
      timeZone: "UTC",
    });
    const service = new MeService({ client } as never);

    const result = await service.getMe("user-1");

    expect(result.settings.locale).toBe("es");
    expect(result.settings.theme).toBe("dark");
    expect(result.settings.displayCurrency).toBe("USD");
  });
});
