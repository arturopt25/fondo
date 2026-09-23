import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import type {
  ServiceCatalogWithCapabilitiesResponse,
  ServiceKey,
  ServiceLedgerMode,
  ServiceWithCapabilities,
} from "@fondo/shared-types";

import { api } from "../../lib/api";
import { queryKeys } from "../../lib/query-keys";

export function useServicesQuery() {
  return useQuery({
    queryKey: queryKeys.services,
    queryFn: async (): Promise<ServiceCatalogWithCapabilitiesResponse> => {
      const response = await api.get("services");
      return response.json<ServiceCatalogWithCapabilitiesResponse>();
    },
    retry: false,
  });
}

export interface EnableServiceInput {
  readonly key: ServiceKey;
  readonly capabilities: string[];
  readonly ledgerMode: ServiceLedgerMode;
}

export function useEnableServiceMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (
      input: EnableServiceInput,
    ): Promise<ServiceWithCapabilities> => {
      const response = await api.post(`services/${input.key}/enable`, {
        json: {
          capabilities: input.capabilities,
          ledgerMode: input.ledgerMode,
        },
      });
      return response.json<ServiceWithCapabilities>();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services });
      notifications.show({
        title: t("services.notifications.enabledTitle"),
        message: t("services.notifications.enabledMessage"),
        color: "signal",
      });
    },
    onError: () => {
      notifications.show({
        title: t("notifications.settingsErrorTitle"),
        message: t("services.notifications.actionError"),
        color: "red",
      });
    },
  });
}

export function useConfigureServiceMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (
      input: EnableServiceInput,
    ): Promise<ServiceWithCapabilities> => {
      const response = await api.patch(`services/${input.key}/config`, {
        json: {
          capabilities: input.capabilities,
          ledgerMode: input.ledgerMode,
        },
      });
      return response.json<ServiceWithCapabilities>();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services });
      notifications.show({
        title: t("services.notifications.updatedTitle"),
        message: t("services.notifications.updatedMessage"),
        color: "signal",
      });
    },
    onError: () => {
      notifications.show({
        title: t("notifications.settingsErrorTitle"),
        message: t("services.notifications.actionError"),
        color: "red",
      });
    },
  });
}

export function useDisableServiceMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (key: ServiceKey): Promise<ServiceWithCapabilities> => {
      const response = await api.post(`services/${key}/disable`);
      return response.json<ServiceWithCapabilities>();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services });
      notifications.show({
        title: t("services.notifications.disabledTitle"),
        message: t("services.notifications.disabledMessage"),
        color: "signal",
      });
    },
    onError: () => {
      notifications.show({
        title: t("notifications.settingsErrorTitle"),
        message: t("services.notifications.actionError"),
        color: "red",
      });
    },
  });
}
