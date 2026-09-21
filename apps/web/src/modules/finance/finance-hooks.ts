import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import type {
  AccountListResponse,
  CategoryListResponse,
  CreateAccountInput,
  CreateCategoryInput,
  FinancialAccount,
} from "@fondo/shared-types";

import { api } from "../../lib/api";
import { queryKeys } from "../../lib/query-keys";

export function useAccountsQuery() {
  return useQuery({
    queryKey: queryKeys.accounts,
    queryFn: async (): Promise<AccountListResponse> => {
      const response = await api.get("accounts");
      return response.json<AccountListResponse>();
    },
    retry: false,
  });
}

export function useCreateAccountMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (input: CreateAccountInput): Promise<FinancialAccount> => {
      const response = await api.post("accounts", { json: input });
      return response.json<FinancialAccount>();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
      notifications.show({
        title: t("finance.notifications.accountCreatedTitle"),
        message: t("finance.notifications.accountCreatedMessage"),
        color: "signal",
      });
    },
    onError: () => {
      notifications.show({
        title: t("notifications.settingsErrorTitle"),
        message: t("finance.notifications.actionError"),
        color: "red",
      });
    },
  });
}

export function useArchiveAccountMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (id: string): Promise<{ id: string }> => {
      const response = await api.post(`accounts/${id}/archive`);
      return response.json<{ id: string }>();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
      notifications.show({
        title: t("finance.notifications.accountArchivedTitle"),
        message: t("finance.notifications.accountArchivedMessage"),
        color: "signal",
      });
    },
    onError: () => {
      notifications.show({
        title: t("notifications.settingsErrorTitle"),
        message: t("finance.notifications.actionError"),
        color: "red",
      });
    },
  });
}

export function useCategoriesQuery(type?: "INCOME" | "EXPENSE") {
  const search = type ? `?type=${type}` : "";
  return useQuery({
    queryKey: [...queryKeys.categories, type ?? "all"] as const,
    queryFn: async (): Promise<CategoryListResponse> => {
      const response = await api.get(`categories${search}`);
      return response.json<CategoryListResponse>();
    },
    retry: false,
  });
}

export function useCreateCategoryMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (input: CreateCategoryInput): Promise<unknown> => {
      const response = await api.post("categories", { json: input });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories });
      notifications.show({
        title: t("finance.notifications.categoryCreatedTitle"),
        message: t("finance.notifications.categoryCreatedMessage"),
        color: "signal",
      });
    },
    onError: () => {
      notifications.show({
        title: t("notifications.settingsErrorTitle"),
        message: t("finance.notifications.actionError"),
        color: "red",
      });
    },
  });
}

export function useArchiveCategoryMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (id: string): Promise<{ id: string }> => {
      const response = await api.post(`categories/${id}/archive`);
      return response.json<{ id: string }>();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories });
      notifications.show({
        title: t("finance.notifications.categoryArchivedTitle"),
        message: t("finance.notifications.categoryArchivedMessage"),
        color: "signal",
      });
    },
    onError: () => {
      notifications.show({
        title: t("notifications.settingsErrorTitle"),
        message: t("finance.notifications.actionError"),
        color: "red",
      });
    },
  });
}