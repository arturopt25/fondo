import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../prisma.service.js";
import { StorageService } from "../storage/storage.service.js";
import type {
  MeResponse,
  UploadAvatarResponse,
  UpdateProfileInput,
  UpdateUserSettingsInput,
  UserSettings,
} from "@fondo/shared-types";

const AVATAR_FILE_TYPES = {
  extensions: ["jpg", "png", "webp"] as const,
  mimeTypes: ["image/jpeg", "image/png", "image/webp"],
};

@Injectable()
export class MeService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(StorageService) private readonly storage: StorageService,
  ) {}

  async getMe(userId: string): Promise<MeResponse> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const membership = await this.prisma.withUserContext(userId, async (tx) =>
      tx.membership.findFirst({
        where: { userId },
        orderBy: { createdAt: "asc" },
      }),
    );

    if (!membership) {
      throw new NotFoundException("No personal space found");
    }

    const tenant = await this.prisma.withTenantContext(
      { tenantId: membership.tenantId, userId },
      async (tx) =>
        tx.tenant.findUnique({
          where: { id: membership.tenantId },
        }),
    );

    if (!tenant) {
      throw new NotFoundException("No personal space found");
    }

    const settings = await this.ensureSettings(userId);

    const image = await this.resolveImage(user.image);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        accountingCurrency: tenant.accountingCurrency as "USD" | "EUR",
        timeZone: tenant.timeZone,
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
      },
    });
  }

  async uploadAvatar(
    userId: string,
    buffer: Buffer,
    filename: string,
    declaredContentType: string,
  ): Promise<UploadAvatarResponse> {
    const existingUser = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { image: true },
    });
    if (!existingUser) {
      throw new NotFoundException("User not found");
    }

    const validated = await this.storage.validateFile(
      buffer,
      filename,
      declaredContentType,
      AVATAR_FILE_TYPES,
      this.storage.avatarMaxFileSizeBytes,
    );
    const key = this.storage.generateKey(
      `avatars/${userId}`,
      validated.extension,
    );

    await this.storage.upload(key, buffer, validated.contentType);

    try {
      await this.prisma.client.user.update({
        where: { id: userId },
        data: { image: key },
      });
    } catch (error) {
      await this.storage.delete(key).catch(() => undefined);
      throw error;
    }

    await this.deletePreviousAvatar(existingUser.image, key);

    return { imageUrl: await this.storage.getSignedDownloadUrl(key) };
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

  private async resolveImage(image: string | null): Promise<string | null> {
    if (!image || !image.startsWith("avatars/")) {
      return image;
    }

    return this.storage.getSignedDownloadUrlOrNull(image);
  }

  private async deletePreviousAvatar(
    image: string | null,
    replacementKey: string,
  ): Promise<void> {
    if (!image?.startsWith("avatars/") || image === replacementKey) {
      return;
    }

    await this.storage.delete(image).catch(() => undefined);
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
