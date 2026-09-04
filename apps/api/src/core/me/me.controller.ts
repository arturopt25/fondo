import {
  Body,
  Controller,
  Get,
  Inject,
  Patch,
  UseGuards,
} from "@nestjs/common";

import {
  updateProfileSchema,
  updateUserSettingsSchema,
} from "@fondo/shared-types";

import { SessionAuthGuard } from "../tenant/session-auth.guard.js";
import type { CurrentUser } from "../tenant/tenant-context.js";
import { MeService } from "./me.service.js";
import { RequestUser } from "./request-user.decorator.js";

@Controller("me")
@UseGuards(SessionAuthGuard)
export class MeController {
  constructor(@Inject(MeService) private readonly meService: MeService) {}

  @Get()
  async getMe(@RequestUser() user: CurrentUser) {
    return this.meService.getMe(user.id);
  }

  @Get("settings")
  async getSettings(@RequestUser() user: CurrentUser) {
    return this.meService.getSettings(user.id);
  }

  @Patch("settings")
  async updateSettings(
    @RequestUser() user: CurrentUser,
    @Body() body: unknown,
  ) {
    const input = updateUserSettingsSchema.parse(body);
    return this.meService.updateSettings(user.id, input);
  }

  @Patch("profile")
  async updateProfile(@RequestUser() user: CurrentUser, @Body() body: unknown) {
    const input = updateProfileSchema.parse(body);
    return this.meService.updateProfile(user.id, input);
  }
}
