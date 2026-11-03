import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Patch,
  PayloadTooLargeException,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";

import {
  updateProfileSchema,
  updateUserSettingsSchema,
} from "@fondo/shared-types";

import { SessionAuthGuard } from "../tenant/session-auth.guard.js";
import type { CurrentUser } from "../tenant/tenant-context.js";
import { API_UPLOAD_THROTTLE, API_WRITE_THROTTLE } from "../config/rate-limits.js";
import { MeService } from "./me.service.js";
import { RequestUser } from "./request-user.decorator.js";
import { StorageService } from "../storage/storage.service.js";
import type { FastifyRequest } from "fastify";

@Controller("me")
@UseGuards(SessionAuthGuard)
export class MeController {
  constructor(
    @Inject(MeService) private readonly meService: MeService,
    @Inject(StorageService) private readonly storage: StorageService,
  ) {}

  @Get()
  async getMe(@RequestUser() user: CurrentUser) {
    return this.meService.getMe(user.id);
  }

  @Get("settings")
  async getSettings(@RequestUser() user: CurrentUser) {
    return this.meService.getSettings(user.id);
  }

  @Patch("settings")
  @Throttle(API_WRITE_THROTTLE)
  async updateSettings(
    @RequestUser() user: CurrentUser,
    @Body() body: unknown,
  ) {
    const input = updateUserSettingsSchema.parse(body);
    return this.meService.updateSettings(user.id, input);
  }

  @Patch("profile")
  @Throttle(API_WRITE_THROTTLE)
  async updateProfile(@RequestUser() user: CurrentUser, @Body() body: unknown) {
    const input = updateProfileSchema.parse(body);
    return this.meService.updateProfile(user.id, input);
  }

  @Post("avatar")
  @Throttle(API_UPLOAD_THROTTLE)
  async uploadAvatar(
    @RequestUser() user: CurrentUser,
    @Req() request: FastifyRequest,
  ) {
    const file = await request.file({
      limits: {
        fileSize: this.storage.avatarMaxFileSizeBytes,
        files: 1,
      },
    });

    if (!file) {
      throw new BadRequestException("Avatar file is required");
    }

    let buffer: Buffer;
    try {
      buffer = await file.toBuffer();
    } catch (error) {
      if (isMultipartFileTooLarge(error)) {
        throw new PayloadTooLargeException(
          `Avatar exceeds the maximum allowed size of ${this.storage.avatarMaxFileSizeBytes} bytes`,
        );
      }
      throw error;
    }

    return this.meService.uploadAvatar(
      user.id,
      buffer,
      file.filename,
      file.mimetype,
    );
  }
}

function isMultipartFileTooLarge(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    error.code === "FST_REQ_FILE_TOO_LARGE"
  );
}
