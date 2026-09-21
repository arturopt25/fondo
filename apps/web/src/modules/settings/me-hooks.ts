import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";

import type {
  MeResponse,
  UpdateProfileInput,
  UpdateUserSettingsInput,
  UserSettings,
} from "@fondo/shared-types";

import { api } from "../../lib/api";
import { queryKeys } from "../../lib/query-keys";
import {
  changePassword,
  listSessions,
  revokeOtherSessions,
  revokeSession,
  type ActiveSession,
} from "../auth/auth-client";

export function useMeQuery() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: async (): Promise<MeResponse> => {
      const response = await api.get("me");
      return response.json<MeResponse>();
    },
    retry: false,
  });
}

export function useSettingsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.meSettings,
    queryFn: async (): Promise<UserSettings> => {
      const response = await api.get("me/settings");
      return response.json<UserSettings>();
    },
    retry: false,
    enabled,
  });
}

export function useUpdateSettingsMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (
      input: UpdateUserSettingsInput,
    ): Promise<UserSettings> => {
      const response = await api.patch("me/settings", { json: input });
      return response.json<UserSettings>();
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKeys.meSettings, settings);
      queryClient.invalidateQueries({ queryKey: queryKeys.me });
      notifications.show({
        title: t("notifications.settingsSavedTitle"),
        message: t("notifications.settingsSavedMessage"),
        color: "signal",
      });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.meSettings });
      notifications.show({
        title: t("notifications.settingsErrorTitle"),
        message: t("notifications.settingsErrorMessage"),
        color: "red",
      });
    },
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (input: UpdateProfileInput): Promise<void> => {
      await api.patch("me/profile", { json: input });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.me });
      notifications.show({
        title: t("notifications.profileSavedTitle"),
        message: t("notifications.profileSavedMessage"),
        color: "signal",
      });
    },
    onError: () => {
      notifications.show({
        title: t("notifications.settingsErrorTitle"),
        message: t("notifications.settingsErrorMessage"),
        color: "red",
      });
    },
  });
}

export function useChangePasswordMutation() {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (input: {
      readonly currentPassword: string;
      readonly newPassword: string;
    }): Promise<void> => {
      await changePassword(input.currentPassword, input.newPassword);
    },
    onSuccess: () => {
      notifications.show({
        title: t("settings.security.passwordChangedTitle"),
        message: t("settings.security.passwordChangedMessage"),
        color: "signal",
      });
    },
    onError: () => {
      notifications.show({
        title: t("notifications.settingsErrorTitle"),
        message: t("settings.security.passwordError"),
        color: "red",
      });
    },
  });
}

export function useSessionsQuery() {
  return useQuery({
    queryKey: queryKeys.meSessions,
    queryFn: async (): Promise<ActiveSession[]> => listSessions(),
    retry: false,
  });
}

export function useRevokeSessionMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (token: string): Promise<void> => {
      await revokeSession(token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.meSessions });
      notifications.show({
        title: t("settings.security.sessionRevokedTitle"),
        message: t("settings.security.sessionRevokedMessage"),
        color: "signal",
      });
    },
    onError: () => {
      notifications.show({
        title: t("notifications.settingsErrorTitle"),
        message: t("settings.security.sessionError"),
        color: "red",
      });
    },
  });
}

export function useRevokeOtherSessionsMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      await revokeOtherSessions();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.meSessions });
      notifications.show({
        title: t("settings.security.sessionsRevokedTitle"),
        message: t("settings.security.sessionsRevokedMessage"),
        color: "signal",
      });
    },
    onError: () => {
      notifications.show({
        title: t("notifications.settingsErrorTitle"),
        message: t("settings.security.sessionError"),
        color: "red",
      });
    },
  });
}
