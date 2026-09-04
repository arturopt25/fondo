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
