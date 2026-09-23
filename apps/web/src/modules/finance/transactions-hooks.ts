import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import type {
  CreateExpenseInput,
  CreateIncomeInput,
  LedgerBalanceResponse,
  Transaction,
  TransactionListResponse,
} from "@fondo/shared-types";

import { api } from "../../lib/api";
import { queryKeys } from "../../lib/query-keys";

export function useTransactionsQuery() {
  return useQuery({
    queryKey: queryKeys.transactions,
    queryFn: async (): Promise<TransactionListResponse> => {
      const response = await api.get("transactions");
      return response.json<TransactionListResponse>();
    },
    retry: false,
  });
}

export function useLedgerBalanceQuery() {
  return useQuery({
    queryKey: queryKeys.ledgerBalance,
    queryFn: async (): Promise<LedgerBalanceResponse> => {
      const response = await api.get("ledger/balance");
      return response.json<LedgerBalanceResponse>();
    },
    retry: false,
  });
}

export function useCreateIncomeMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (input: CreateIncomeInput): Promise<Transaction> => {
      const response = await api.post("transactions/income", { json: input });
      return response.json<Transaction>();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
      queryClient.invalidateQueries({ queryKey: queryKeys.ledgerBalance });
      notifications.show({
        title: t("transactions.notifications.incomeCreatedTitle"),
        message: t("transactions.notifications.createdMessage"),
        color: "signal",
      });
    },
    onError: () => {
      notifications.show({
        title: t("notifications.settingsErrorTitle"),
        message: t("transactions.notifications.actionError"),
        color: "red",
      });
    },
  });
}

export function useCreateExpenseMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (input: CreateExpenseInput): Promise<Transaction> => {
      const response = await api.post("transactions/expense", { json: input });
      return response.json<Transaction>();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
      queryClient.invalidateQueries({ queryKey: queryKeys.ledgerBalance });
      notifications.show({
        title: t("transactions.notifications.expenseCreatedTitle"),
        message: t("transactions.notifications.createdMessage"),
        color: "signal",
      });
    },
    onError: () => {
      notifications.show({
        title: t("notifications.settingsErrorTitle"),
        message: t("transactions.notifications.actionError"),
        color: "red",
      });
    },
  });
}
