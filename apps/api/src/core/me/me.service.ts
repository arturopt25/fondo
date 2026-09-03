import { Injectable, NotFoundException } from "@nestjs/common";

// Value import required for NestJS decorator metadata (design:paramtypes).
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { PrismaService } from "../prisma.service.js";
import type {
  MeResponse,
  UpdateProfileInput,
  UpdateUserSettingsInput,
  UserSettings,
} from "@fondo/shared-types";

@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string): Promise<MeResponse> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const membership = await this.prisma.client.membership.findFirst({
      where: { userId },
      include: { tenant: true },
      orderBy: { createdAt: "asc" },
    });

    if (!membership) {
      throw new NotFoundException("No personal space found");
    }

    const settings = await this.ensureSettings(userId);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
      tenant: {
        id: membership.tenant.id,
        name: membership.tenant.name,
        accountingCurrency: membership.tenant.accountingCurrency as
          "USD" | "EUR",
        timeZone: membership.tenant.timeZone,
      },
      membership: {
        role: membership.role === "ADMIN" ? "ADMIN" : "MEMBER",
      },
      settings: toUserSettings(settings),
    };
  }

  async getSettings(userId: string): Promise<UserSettings> {
    return toUserSettings(await this.ensureSettings(userId));
  }

  async updateSettings(
    userId: string,
    input: UpdateUserSettingsInput,
  ): Promise<UserSettings> {
    const settings = await this.ensureSettings(userId);

    const updated = await this.prisma.client.userSettings.update({
      where: { id: settings.id },
      data: {
        ...(input.locale !== undefined ? { locale: input.locale } : {}),
        ...(input.theme !== undefined ? { theme: input.theme } : {}),
        ...(input.displayCurrency !== undefined
          ? { displayCurrency: input.displayCurrency }
          : {}),
        ...(input.timeZone !== undefined ? { timeZone: input.timeZone } : {}),
      },
    });

    return toUserSettings(updated);
  }

  async updateProfile(
    userId: string,
    input: UpdateProfileInput,
  ): Promise<void> {
    await this.prisma.client.user.update({
      where: { id: userId },
      data: {
        name: input.name,
        ...(input.image !== undefined ? { image: input.image } : {}),
      },
    });
  }

  private async ensureSettings(userId: string) {
    const existing = await this.prisma.client.userSettings.findUnique({
      where: { userId },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.client.userSettings.create({
      data: { userId },
    });
  }
}

function toUserSettings(settings: {
  locale: string;
  theme: string;
  displayCurrency: string;
  timeZone: string;
}): UserSettings {
  const locale = settings.locale === "en" ? "en" : "es";
  const theme =
    settings.theme === "light" || settings.theme === "system"
      ? settings.theme
      : "dark";
  const displayCurrency = settings.displayCurrency === "EUR" ? "EUR" : "USD";

  return {
    locale,
    theme,
    displayCurrency,
    timeZone: settings.timeZone,
  };
}
