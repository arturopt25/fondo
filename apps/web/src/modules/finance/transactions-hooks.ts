import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import type {
  CreateExpenseInput,
  CreateIncomeInput,
  CreateTransferInput,
  LedgerBalanceResponse,
  Transaction,
  TransactionListResponse,
} from "@fondo/shared-types";

import { api } from "../../lib/api";
import { queryKeys, type TransactionListQueryParams } from "../../lib/query-keys";

export interface MutationWithIdempotencyInput<TInput> {
  readonly input: TInput;
  readonly idempotencyKey: string;
}

function invalidateFinancialQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  queryClient.invalidateQueries({ queryKey: ["transactions"] });
  queryClient.invalidateQueries({ queryKey: queryKeys.ledgerBalance });
  queryClient.invalidateQueries({ queryKey: ["reports"] });
}

export function useTransactionsQuery(params: TransactionListQueryParams) {
  return useQuery({
    queryKey: queryKeys.transactions(params),
    queryFn: async (): Promise<TransactionListResponse> => {
      const response = await api.get("transactions", {
        searchParams: {
          page: String(params.page),
          pageSize: String(params.pageSize),
        },
      });
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
    mutationFn: async ({
      input,
      idempotencyKey,
    }: MutationWithIdempotencyInput<CreateIncomeInput>): Promise<Transaction> => {
      const response = await api.post("transactions/income", {
        json: input,
        headers: { "Idempotency-Key": idempotencyKey },
      });
      return response.json<Transaction>();
    },
    onSuccess: () => {
      invalidateFinancialQueries(queryClient);
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
    mutationFn: async ({
      input,
      idempotencyKey,
    }: MutationWithIdempotencyInput<CreateExpenseInput>): Promise<Transaction> => {
      const response = await api.post("transactions/expense", {
        json: input,
        headers: { "Idempotency-Key": idempotencyKey },
      });
      return response.json<Transaction>();
    },
    onSuccess: () => {
      invalidateFinancialQueries(queryClient);
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

export function useCreateTransferMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      input,
      idempotencyKey,
    }: MutationWithIdempotencyInput<CreateTransferInput>): Promise<Transaction> => {
      const response = await api.post("transactions/transfer", {
        json: input,
        headers: { "Idempotency-Key": idempotencyKey },
      });
      return response.json<Transaction>();
    },
    onSuccess: () => {
      invalidateFinancialQueries(queryClient);
      notifications.show({
        title: t("transactions.notifications.transferCreatedTitle"),
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

export function useReverseTransactionMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      note?: string | undefined;
    }): Promise<Transaction> => {
      const response = await api.post(`transactions/${input.id}/reverse`, {
        json: { ...(input.note ? { note: input.note } : {}) },
      });
      return response.json<Transaction>();
    },
    onSuccess: () => {
      invalidateFinancialQueries(queryClient);
      notifications.show({
        title: t("transactions.notifications.reversedTitle"),
        message: t("transactions.notifications.reversedMessage"),
        color: "signal",
      });
    },
    onError: () => {
      notifications.show({
        title: t("notifications.settingsErrorTitle"),
        message: t("transactions.notifications.reverseError"),
        color: "red",
      });
    },
  });
}
