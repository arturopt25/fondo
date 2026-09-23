import type { ServiceKey } from "@fondo/shared-types";

export interface ReportQueryParams {
  readonly from?: string;
  readonly to?: string;
  readonly serviceKey?: ServiceKey | undefined;
}

export const queryKeys = {
  me: ["me"] as const,
  meSettings: ["me", "settings"] as const,
  meSessions: ["me", "sessions"] as const,
  services: ["services"] as const,
  accounts: ["accounts"] as const,
  categories: ["categories"] as const,
  transactions: ["transactions"] as const,
  ledgerBalance: ["ledger", "balance"] as const,
  reports: {
    dashboard: (params: ReportQueryParams) =>
      ["reports", "dashboard", params] as const,
    cashFlow: (params: ReportQueryParams) =>
      ["reports", "cash-flow", params] as const,
    categorySpend: (params: ReportQueryParams) =>
      ["reports", "category-spend", params] as const,
  },
};
