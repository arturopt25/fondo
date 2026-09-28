import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fondoTheme } from "@fondo/ui";

vi.mock("@mantine/core", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;

  const Select = ({
    label,
    onChange,
    data,
  }: {
    readonly label?: string;
    readonly value?: string | null;
    readonly onChange?: (value: string | null) => void;
    readonly data?: ReadonlyArray<{
      readonly value: string;
      readonly label: string;
    }>;
  }) => (
    <div>
      <span>{label ?? ""}</span>
      <select
        data-testid={`select-${String(label)}`}
        onChange={(event) => onChange?.(event.currentTarget.value)}
      >
        {(data ?? []).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  const NumberInput = ({
    label,
    onChange,
  }: {
    readonly label?: string;
    readonly onChange?: (value: number | string) => void;
  }) => (
    <div>
      <span>{label ?? ""}</span>
      <input
        type="number"
        data-testid={`number-${String(label)}`}
        onChange={(event) => onChange?.(Number(event.currentTarget.value))}
      />
    </div>
  );

  const SegmentedControl = ({
    data,
    value,
    onChange,
  }: {
    readonly data?: ReadonlyArray<{ readonly value: string; readonly label: string }>;
    readonly value?: string;
    readonly onChange?: (value: string) => void;
  }) => (
    <div role="radiogroup">
      {(data ?? []).map((item) => (
        <button
          key={item.value}
          type="button"
          aria-pressed={value === item.value}
          onClick={() => onChange?.(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );

  return { ...actual, Select, NumberInput, SegmentedControl };
});

const financeHooks = vi.hoisted(() => ({
  useAccountsQuery: vi.fn(),
  useCategoriesQuery: vi.fn(),
}));
const transactionsHooks = vi.hoisted(() => ({
  useTransactionsQuery: vi.fn(),
  useLedgerBalanceQuery: vi.fn(),
  useCreateIncomeMutation: vi.fn(),
  useCreateExpenseMutation: vi.fn(),
  useCreateTransferMutation: vi.fn(),
  useReverseTransactionMutation: vi.fn(),
}));
const servicesHooks = vi.hoisted(() => ({
  useServicesQuery: vi.fn(),
}));
const preferences = vi.hoisted(() => ({
  useAppPreferences: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "es" },
  }),
}));
vi.mock("../../../../modules/finance/finance-hooks", () => ({
  useAccountsQuery: financeHooks.useAccountsQuery,
  useCategoriesQuery: financeHooks.useCategoriesQuery,
}));
vi.mock("../../../../modules/finance/transactions-hooks", () => ({
  useTransactionsQuery: transactionsHooks.useTransactionsQuery,
  useLedgerBalanceQuery: transactionsHooks.useLedgerBalanceQuery,
  useCreateIncomeMutation: transactionsHooks.useCreateIncomeMutation,
  useCreateExpenseMutation: transactionsHooks.useCreateExpenseMutation,
  useCreateTransferMutation: transactionsHooks.useCreateTransferMutation,
  useReverseTransactionMutation:
    transactionsHooks.useReverseTransactionMutation,
}));
vi.mock("../../../../modules/services/services-hooks", () => ({
  useServicesQuery: servicesHooks.useServicesQuery,
}));
vi.mock("../../../../app/preferences", () => ({
  useAppPreferences: preferences.useAppPreferences,
}));

import { TransactionsPage } from "../../../../modules/finance/TransactionsPage";

function transaction(overrides: {
  readonly id: string;
  readonly reversedById?: string | null;
  readonly reversesId?: string | null;
}): {
  id: string;
  type: string;
  amountMinor: number;
  categoryId: string | null;
  accountId: string | null;
  transferFromId: string | null;
  transferToId: string | null;
  serviceKey: string | null;
  capabilityKey: string | null;
  sourceType: string | null;
  sourceId: string | null;
  note: string | null;
  occurredAt: string;
  createdAt: string;
  reversesId: string | null;
  reversedById: string | null;
  entries: unknown[];
} {
  return {
    id: overrides.id,
    type: "EXPENSE",
    amountMinor: 10_000,
    categoryId: null,
    accountId: null,
    transferFromId: null,
    transferToId: null,
    serviceKey: null,
    capabilityKey: null,
    sourceType: null,
    sourceId: null,
    note: "Coffee",
    occurredAt: "2026-09-20T10:00:00.000Z",
    createdAt: "2026-09-20T10:00:00.000Z",
    reversesId: overrides.reversesId ?? null,
    reversedById: overrides.reversedById ?? null,
    entries: [],
  };
}

function renderPage() {
  return render(
    <MantineProvider theme={fondoTheme}>
      <TransactionsPage />
    </MantineProvider>,
  );
}

describe("TransactionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    financeHooks.useAccountsQuery.mockReturnValue({
      data: {
        items: [
          {
            id: "acc-1",
            name: "Cash",
            type: "CASH",
            currency: "USD",
            openingBalanceMinor: 0,
            isActive: true,
            createdAt: "2026-01-01T00:00:00.000Z",
          },
          {
            id: "acc-2",
            name: "Bank",
            type: "BANK",
            currency: "USD",
            openingBalanceMinor: 0,
            isActive: true,
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        total: 2,
        page: 1,
        pageSize: 20,
      },
      isLoading: false,
      isError: false,
    });
    financeHooks.useCategoriesQuery.mockReturnValue({
      data: { items: [], total: 0, page: 1, pageSize: 20 },
      isLoading: false,
      isError: false,
    });
    transactionsHooks.useTransactionsQuery.mockReturnValue({
      data: {
        items: [
          transaction({ id: "t1" }),
          transaction({ id: "t2", reversedById: "t3" }),
          transaction({ id: "t3", reversesId: "t2" }),
        ],
        total: 3,
        page: 1,
        pageSize: 20,
      },
      isLoading: false,
      isError: false,
    });
    transactionsHooks.useLedgerBalanceQuery.mockReturnValue({
      data: {
        ledgerId: "led-1",
        totalMinor: 50_000,
        accounts: [
          { id: "acc-1", name: "Cash", balanceMinor: 20_000 },
          { id: "acc-2", name: "Bank", balanceMinor: 30_000 },
        ],
        exchangeRate: null,
      },
      isLoading: false,
      isError: false,
    });
    for (const hook of [
      transactionsHooks.useCreateIncomeMutation,
      transactionsHooks.useCreateExpenseMutation,
      transactionsHooks.useCreateTransferMutation,
      transactionsHooks.useReverseTransactionMutation,
    ]) {
      hook.mockReturnValue({ mutate: vi.fn(), isPending: false });
    }
    servicesHooks.useServicesQuery.mockReturnValue({
      data: { services: [] },
      isLoading: false,
      isError: false,
    });
    preferences.useAppPreferences.mockReturnValue({
      displayCurrency: "USD",
    });
  });

  it("renders movements and formats amounts in the display currency", () => {
    renderPage();

    expect(screen.getByText("500 US$")).toBeInTheDocument();
    expect(screen.getByText("200 US$")).toBeInTheDocument();
    expect(screen.getByText("300 US$")).toBeInTheDocument();
    expect(screen.getAllByText("- 100 US$")).toHaveLength(3);
  });

  it("applies the exchange rate from the ledger balance", () => {
    transactionsHooks.useLedgerBalanceQuery.mockReturnValue({
      data: {
        ledgerId: "led-1",
        totalMinor: 50_000,
        accounts: [],
        exchangeRate: {
          from: "USD",
          to: "EUR",
          rate: 0.5,
          effectiveAt: "2026-09-01T00:00:00.000Z",
          source: "configured",
        },
      },
      isLoading: false,
      isError: false,
    });
    preferences.useAppPreferences.mockReturnValue({
      displayCurrency: "EUR",
    });

    renderPage();

    expect(screen.getByText("250 €")).toBeInTheDocument();
    expect(screen.getAllByText("- 50 €")).toHaveLength(3);
  });

  it("records a transfer with an idempotency key", async () => {
    const user = userEvent.setup();
    const createTransfer = vi.fn();
    transactionsHooks.useCreateTransferMutation.mockReturnValue({
      mutate: createTransfer,
      isPending: false,
    });
    renderPage();

    await user.click(screen.getByText("transactions.types.TRANSFER"));
    await user.selectOptions(
      screen.getByTestId("select-transactions.fromAccount"),
      "acc-1",
    );
    await user.selectOptions(
      screen.getByTestId("select-transactions.toAccount"),
      "acc-2",
    );
    await user.type(
      screen.getByTestId("number-transactions.amount"),
      "25",
    );
    await user.click(
      screen.getByRole("button", { name: "transactions.createTransfer" }),
    );

    await waitFor(() => expect(createTransfer).toHaveBeenCalled());
    const variables = createTransfer.mock.calls[0]?.[0] as {
      input: { fromAccountId: string; toAccountId: string; amountMinor: number };
      idempotencyKey: string;
    };
    expect(variables.input).toEqual({
      fromAccountId: "acc-1",
      toAccountId: "acc-2",
      amountMinor: 2500,
    });
    expect(variables.idempotencyKey).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("only offers the reverse action for reversible movements", () => {
    renderPage();

    const reverseButtons = screen.getAllByRole("button", {
      name: "transactions.reverse",
    });
    expect(reverseButtons).toHaveLength(1);
  });

  it("reverses a movement with an optional note", async () => {
    const user = userEvent.setup();
    const reverse = vi.fn();
    transactionsHooks.useReverseTransactionMutation.mockReturnValue({
      mutate: reverse,
      isPending: false,
    });
    renderPage();

    await user.click(
      screen.getByRole("button", { name: "transactions.reverse" }),
    );

    const noteInput = await screen.findByPlaceholderText(
      "transactions.reverseModal.notePlaceholder",
    );
    expect(
      screen.getByText("transactions.reverseModal.title"),
    ).toBeInTheDocument();

    await user.type(noteInput, "Wrong amount");
    await user.click(
      screen.getByRole("button", { name: "transactions.reverseModal.confirm" }),
    );

    await waitFor(() => expect(reverse).toHaveBeenCalled());
    expect(reverse).toHaveBeenCalledWith(
      { id: "t1", note: "Wrong amount" },
      expect.anything(),
    );
  });

  it("requests the next page when paginating", async () => {
    const user = userEvent.setup();
    transactionsHooks.useTransactionsQuery.mockReturnValue({
      data: {
        items: [transaction({ id: "t1" })],
        total: 45,
        page: 1,
        pageSize: 20,
      },
      isLoading: false,
      isError: false,
    });
    renderPage();

    expect(transactionsHooks.useTransactionsQuery).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
    });

    await user.click(screen.getByRole("button", { name: "2" }));

    expect(transactionsHooks.useTransactionsQuery).toHaveBeenLastCalledWith({
      page: 2,
      pageSize: 20,
    });
  });
});
