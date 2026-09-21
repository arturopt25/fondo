import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import type {
  ServiceCatalogResponse,
  ServiceKey,
  ServiceWithStatus,
} from "@fondo/shared-types";

import { api } from "../../lib/api";
import { queryKeys } from "../../lib/query-keys";

export function useServicesQuery() {
  return useQuery({
    queryKey: queryKeys.services,
    queryFn: async (): Promise<ServiceCatalogResponse> => {
      const response = await api.get("services");
      return response.json<ServiceCatalogResponse>();
    },
    retry: false,
  });
}

function useServiceStatusMutation(action: "enable" | "disable") {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (key: ServiceKey): Promise<ServiceWithStatus> => {
      const response = await api.post(`services/${key}/${action}`);
      return response.json<ServiceWithStatus>();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services });
      notifications.show({
        title:
          action === "enable"
            ? t("services.notifications.enabledTitle")
            : t("services.notifications.disabledTitle"),
        message:
          action === "enable"
            ? t("services.notifications.enabledMessage")
            : t("services.notifications.disabledMessage"),
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

export function useEnableServiceMutation() {
  return useServiceStatusMutation("enable");
}

export function useDisableServiceMutation() {
  return useServiceStatusMutation("disable");
}