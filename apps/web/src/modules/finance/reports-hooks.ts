import { useQuery } from "@tanstack/react-query";

import type {
  CategorySpendResponse,
  DashboardReport,
  ServiceKey,
} from "@fondo/shared-types";

import { api } from "../../lib/api";
import { queryKeys, type ReportQueryParams } from "../../lib/query-keys";
import type { DateRange, PeriodKey } from "../../components/DateRangeSelector";

export interface PeriodRange {
  readonly from?: string;
  readonly to?: string;
}

export function resolvePeriodRange(
  period: PeriodKey,
  customRange: DateRange,
): PeriodRange {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (period) {
    case "currentMonth":
      return { from: new Date(year, month, 1).toISOString() };
    case "previousMonth":
      return {
        from: new Date(year, month - 1, 1).toISOString(),
        to: new Date(year, month, 1).toISOString(),
      };
    case "currentYear":
      return { from: new Date(year, 0, 1).toISOString() };
    case "custom": {
      const [from, to] = customRange;
      if (!from || !to) {
        return {};
      }
      return { from: from.toISOString(), to: to.toISOString() };
    }
  }
}

function toQueryString(params: ReportQueryParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      search.set(key, value);
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function useDashboardReportQuery(
  range: PeriodRange,
  serviceKey?: ServiceKey,
) {
  const params: ReportQueryParams = { ...range, serviceKey };
  return useQuery({
    queryKey: queryKeys.reports.dashboard(params),
    queryFn: async (): Promise<DashboardReport> => {
      const response = await api.get(
        `reports/dashboard${toQueryString(params)}`,
      );
      return response.json<DashboardReport>();
    },
    retry: false,
  });
}

export function useCategorySpendQuery(
  range: PeriodRange,
  serviceKey?: ServiceKey,
) {
  const params: ReportQueryParams = { ...range, serviceKey };
  return useQuery({
    queryKey: queryKeys.reports.categorySpend(params),
    queryFn: async (): Promise<CategorySpendResponse> => {
      const response = await api.get(
        `reports/category-spend${toQueryString(params)}`,
      );
      return response.json<CategorySpendResponse>();
    },
    retry: false,
  });
}
