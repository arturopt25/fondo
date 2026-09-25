import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fondoTheme } from "@fondo/ui";

const servicesHooks = vi.hoisted(() => ({
  useServicesQuery: vi.fn(),
}));
const reportsHooks = vi.hoisted(() => ({
  useDashboardReportQuery: vi.fn(),
}));
const preferences = vi.hoisted(() => ({
  useAppPreferences: vi.fn(),
}));
const budgetsHooks = vi.hoisted(() => ({
  resolveBudgetPeriodRange: vi.fn(),
  useBudgetsQuery: vi.fn(),
  useUpsertBudgetMutation: vi.fn(),
  useDeleteBudgetMutation: vi.fn(),
}));

vi.mock("react-i18next", async () => {
  const es = (await import("../../../../locales/es/translation.json")).default;

  const translate = (key: string, options?: Record<string, unknown>) => {
    let node: unknown = es;
    for (const segment of key.split(".")) {
      if (typeof node !== "object" || node === null) {
        return options?.defaultValue ?? key;
      }
      node = (node as Record<string, unknown>)[segment];
    }
    if (typeof node === "string") {
      return node.replace(
        /\{\{name\}\}/g,
        (options?.name as string | undefined) ?? "",
      );
    }
    return options?.defaultValue ?? key;
  };

  return {
    useTranslation: () => ({ t: translate, i18n: { language: "es" } }),
  };
});
vi.mock("../../../../modules/services/services-hooks", () => ({
  useServicesQuery: servicesHooks.useServicesQuery,
}));
vi.mock("../../../../modules/finance/reports-hooks", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    useDashboardReportQuery: reportsHooks.useDashboardReportQuery,
  };
});
vi.mock("../../../../app/preferences", () => ({
  useAppPreferences: preferences.useAppPreferences,
}));
vi.mock("../../../../modules/finance/budgets-hooks", () => ({
  resolveBudgetPeriodRange: budgetsHooks.resolveBudgetPeriodRange,
  useBudgetsQuery: budgetsHooks.useBudgetsQuery,
  useUpsertBudgetMutation: budgetsHooks.useUpsertBudgetMutation,
  useDeleteBudgetMutation: budgetsHooks.useDeleteBudgetMutation,
}));

import { DashboardPage } from "../../../../modules/dashboard/DashboardPage";

const catalog = {
  services: [
    {
      key: "PERSONAL_FINANCE",
      name: "Personal Finance",
      description: "PF",
      status: "ACTIVE",
      ledgerMode: "SHARED",
      capabilities: [
        {
          key: "accounts",
          name: "Accounts",
          description: "",
          required: true,
          defaultEnabled: true,
          dependsOn: [],
        },
        {
          key: "budgets",
          name: "Budgets",
          description: "",
          required: false,
          defaultEnabled: true,
          dependsOn: ["expenses"],
        },
      ],
      selectedCapabilities: ["accounts", "budgets"],
    },
    {
      key: "HOME",
      name: "Home",
      description: "H",
      status: "ACTIVE",
      ledgerMode: "SHARED",
      capabilities: [
        {
          key: "properties",
          name: "Properties",
          description: "",
          required: true,
          defaultEnabled: true,
          dependsOn: [],
        },
        {
          key: "expenses",
          name: "Home expenses",
          description: "",
          required: true,
          defaultEnabled: true,
          dependsOn: [],
        },
        {
          key: "recurring",
          name: "Recurring utilities",
          description: "",
          required: false,
          defaultEnabled: true,
          dependsOn: ["expenses"],
        },
        {
          key: "inventory",
          name: "Asset inventory",
          description: "",
          required: false,
          defaultEnabled: false,
          dependsOn: ["properties"],
        },
        {
          key: "documents",
          name: "Property documents",
          description: "",
          required: false,
          defaultEnabled: false,
          dependsOn: ["properties"],
        },
      ],
      selectedCapabilities: [
        "properties",
        "expenses",
        "recurring",
        "inventory",
      ],
    },
    {
      key: "VEHICLE",
      name: "Vehicle",
      description: "V",
      status: "DISABLED",
      ledgerMode: "SHARED",
      capabilities: [],
      selectedCapabilities: [],
    },
  ],
};

const report = {
  period: { from: "2026-09-01", to: "2026-09-30" },
  balanceMinor: 125000,
  summary: {
    incomeMinor: 100000,
    expenseMinor: 25000,
    savingsMinor: 75000,
    savingsRate: 75,
  },
  cashFlow: [],
  categorySpend: [],
  recent: [],
  exchangeRate: null,
  serviceBalances: [
    {
      serviceKey: "PERSONAL_FINANCE",
      balanceMinor: 75000,
      capabilities: [
        { key: "accounts", balanceMinor: 50000 },
        { key: "budgets", balanceMinor: 25000 },
      ],
    },
    {
      serviceKey: "HOME",
      balanceMinor: 100000,
      capabilities: [
        { key: "properties", balanceMinor: 0 },
        { key: "expenses", balanceMinor: 100000 },
        { key: "recurring", balanceMinor: 0 },
        { key: "inventory", balanceMinor: 0 },
      ],
    },
  ],
};

function renderDashboard() {
  return render(
    <MantineProvider theme={fondoTheme}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </MantineProvider>,
  );
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    preferences.useAppPreferences.mockReturnValue({
      displayCurrency: "USD",
    });
    reportsHooks.useDashboardReportQuery.mockReturnValue({
      data: report,
      isLoading: false,
      isError: false,
    });
    servicesHooks.useServicesQuery.mockReturnValue({
      data: catalog,
      isLoading: false,
      isError: false,
    });
    budgetsHooks.resolveBudgetPeriodRange.mockReturnValue({
      from: "2026-09",
      to: "2026-09",
    });
    budgetsHooks.useBudgetsQuery.mockReturnValue({
      data: {
        period: { from: "2026-09", to: "2026-09" },
        items: [
          {
            categoryId: "budget-category",
            categoryName: "Comida",
            budgetId: null,
            budgetMinor: null,
            actualMinor: 0,
            remainingMinor: null,
            utilizationPercent: null,
          },
        ],
      },
      isLoading: false,
      isError: false,
    });
    budgetsHooks.useUpsertBudgetMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    budgetsHooks.useDeleteBudgetMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  it("shows the total balance at the top and renders personal finance as a service card", () => {
    renderDashboard();

    expect(screen.getByText("Balance total")).toBeInTheDocument();
    expect(screen.getAllByText(/1250\s*US\$/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Ingresos")).toBeInTheDocument();
    expect(screen.getByText("Gastos")).toBeInTheDocument();
    expect(screen.getByText("Ahorro neto")).toBeInTheDocument();
    expect(screen.getByText("Tasa de ahorro")).toBeInTheDocument();
    expect(screen.getAllByText("Finanzas personales")).toHaveLength(1);
    expect(
      screen.getAllByText("Cuentas y saldos").length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Presupuestos").length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getByText("Total Finanzas personales")).toBeInTheDocument();
  });

  it("renders each active service as a compact card with capability rows and a total", async () => {
    const user = userEvent.setup();
    renderDashboard();

    expect(screen.getByText("Servicios activos")).toBeInTheDocument();
    expect(screen.getByText("Hogar")).toBeInTheDocument();
    expect(screen.getByText("Viviendas")).toBeInTheDocument();
    expect(screen.getByText("Gastos del hogar")).toBeInTheDocument();
    expect(screen.getByText("Servicios recurrentes")).toBeInTheDocument();
    expect(screen.queryByText("Inventario de bienes")).not.toBeInTheDocument();
    expect(screen.getByText("Total Hogar")).toBeInTheDocument();

    await user.click(screen.getByText("Ver mas"));

    expect(screen.getByText("Inventario de bienes")).toBeInTheDocument();
    expect(screen.getByText("Ver menos")).toBeInTheDocument();
  });

  it("shows a zero balance for active capabilities without movements", () => {
    renderDashboard();

    expect(screen.getAllByText(/0\s*US\$/).length).toBeGreaterThanOrEqual(2);
  });

  it("excludes unselected capabilities and disabled services", () => {
    renderDashboard();

    expect(
      screen.queryByText("Documentos de la vivienda"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Vehículo")).not.toBeInTheDocument();
  });

  it("collapses personal finance capabilities behind a show more toggle", async () => {
    const user = userEvent.setup();
    servicesHooks.useServicesQuery.mockReturnValue({
      data: {
        services: [
          {
            key: "PERSONAL_FINANCE",
            name: "Personal Finance",
            description: "PF",
            status: "ACTIVE",
            ledgerMode: "SHARED",
            capabilities: [
              {
                key: "accounts",
                name: "Accounts",
                description: "",
                required: true,
                defaultEnabled: true,
                dependsOn: [],
              },
              {
                key: "budgets",
                name: "Budgets",
                description: "",
                required: false,
                defaultEnabled: true,
                dependsOn: [],
              },
              {
                key: "cashflow",
                name: "Cash flow",
                description: "",
                required: false,
                defaultEnabled: true,
                dependsOn: [],
              },
              {
                key: "recurring",
                name: "Recurring",
                description: "",
                required: false,
                defaultEnabled: false,
                dependsOn: [],
              },
              {
                key: "reports",
                name: "Reports",
                description: "",
                required: false,
                defaultEnabled: false,
                dependsOn: [],
              },
            ],
            selectedCapabilities: [
              "accounts",
              "budgets",
              "cashflow",
              "recurring",
              "reports",
            ],
          },
        ],
      },
      isLoading: false,
      isError: false,
    });
    reportsHooks.useDashboardReportQuery.mockReturnValue({
      data: {
        ...report,
        balanceMinor: 0,
        serviceBalances: [
          {
            serviceKey: "PERSONAL_FINANCE",
            balanceMinor: 0,
            capabilities: [
              { key: "accounts", balanceMinor: 0 },
              { key: "budgets", balanceMinor: 0 },
              { key: "cashflow", balanceMinor: 0 },
              { key: "recurring", balanceMinor: 0 },
              { key: "reports", balanceMinor: 0 },
            ],
          },
        ],
      },
      isLoading: false,
      isError: false,
    });

    renderDashboard();

    expect(screen.getByText("Ver mas")).toBeInTheDocument();
    expect(screen.getByText("Cuentas y saldos")).toBeInTheDocument();
    expect(screen.getByText("Flujo de caja")).toBeInTheDocument();
    expect(
      screen.queryByText("Movimientos recurrentes"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Reportes")).not.toBeInTheDocument();

    await user.click(screen.getByText("Ver mas"));

    expect(screen.getByText("Movimientos recurrentes")).toBeInTheDocument();
    expect(screen.getByText("Reportes")).toBeInTheDocument();
    expect(screen.getByText("Ver menos")).toBeInTheDocument();
  });

  it("keeps the service sheets visible when the financial report is empty", () => {
    reportsHooks.useDashboardReportQuery.mockReturnValue({
      data: {
        ...report,
        balanceMinor: 0,
        summary: {
          incomeMinor: 0,
          expenseMinor: 0,
          savingsMinor: 0,
          savingsRate: 0,
        },
        serviceBalances: [
          {
            serviceKey: "PERSONAL_FINANCE",
            balanceMinor: 0,
            capabilities: [
              { key: "accounts", balanceMinor: 0 },
              { key: "budgets", balanceMinor: 0 },
            ],
          },
          {
            serviceKey: "HOME",
            balanceMinor: 0,
            capabilities: [
              { key: "properties", balanceMinor: 0 },
              { key: "expenses", balanceMinor: 0 },
              { key: "recurring", balanceMinor: 0 },
              { key: "inventory", balanceMinor: 0 },
            ],
          },
        ],
      },
      isLoading: false,
      isError: false,
    });

    renderDashboard();

    expect(screen.getByText("Todavia no hay movimientos")).toBeInTheDocument();
    expect(screen.getByText("Tasa de ahorro")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getByText("Hogar")).toBeInTheDocument();
    expect(screen.getByText("Total Hogar")).toBeInTheDocument();
  });
});
