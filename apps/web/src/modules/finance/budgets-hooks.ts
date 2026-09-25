import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import type {
  BudgetResponse,
  BudgetQuery,
  UpsertBudgetInput,
} from "@fondo/shared-types";

import type { DateRange, PeriodKey } from "../../components/DateRangeSelector";
import { api } from "../../lib/api";
import { queryKeys } from "../../lib/query-keys";

export type BudgetPeriodRange = Pick<BudgetQuery, "from" | "to">;

export function resolveBudgetPeriodRange(
  period: PeriodKey,
  customRange: DateRange,
): BudgetPeriodRange {
  const now = new Date();
  const current = monthKey(now);

  switch (period) {
    case "currentMonth":
      return { from: current, to: current };
    case "previousMonth": {
      const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const key = monthKey(previous);
      return { from: key, to: key };
    }
    case "currentYear":
      return { from: `${now.getFullYear()}-01`, to: current };
    case "custom": {
      const [from, to] = customRange;
      if (!from || !to) {
        return {};
      }
      return { from: monthKey(from), to: monthKey(to) };
    }
  }
}

export function useBudgetsQuery(range: BudgetPeriodRange) {
  const enabled = range.from !== undefined && range.to !== undefined;
  const search = new URLSearchParams();
  if (range.from !== undefined) {
    search.set("from", range.from);
  }
  if (range.to !== undefined) {
    search.set("to", range.to);
  }

  return useQuery({
    queryKey: queryKeys.budgets(range),
    queryFn: async (): Promise<BudgetResponse> => {
      const response = await api.get(`budgets?${search.toString()}`);
      return response.json<BudgetResponse>();
    },
    enabled,
    retry: false,
  });
}

export function useUpsertBudgetMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (input: UpsertBudgetInput) => {
      const response = await api.put("budgets", { json: input });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      notifications.show({
        title: t("dashboard.budgets.savedTitle"),
        message: t("dashboard.budgets.savedMessage"),
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

export function useDeleteBudgetMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`budgets/${id}`);
      return response.json<{ id: string }>();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      notifications.show({
        title: t("dashboard.budgets.deletedTitle"),
        message: t("dashboard.budgets.deletedMessage"),
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

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
