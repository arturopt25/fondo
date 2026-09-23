import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fondoTheme } from "@fondo/ui";

vi.mock("@mantine/core", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;

  const Select = ({
    label,
    value,
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
        value={value ?? ""}
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

  return { ...actual, Select };
});

const financeHooks = vi.hoisted(() => ({
  useAccountsQuery: vi.fn(),
  useCreateAccountMutation: vi.fn(),
  useArchiveAccountMutation: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("../../../../modules/finance/finance-hooks", () => ({
  useAccountsQuery: financeHooks.useAccountsQuery,
  useCreateAccountMutation: financeHooks.useCreateAccountMutation,
  useArchiveAccountMutation: financeHooks.useArchiveAccountMutation,
}));

import { AccountsPage } from "../../../../modules/finance/AccountsPage";

function renderPage() {
  return render(
    <MantineProvider theme={fondoTheme}>
      <AccountsPage />
    </MantineProvider>,
  );
}

describe("AccountsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    financeHooks.useAccountsQuery.mockReturnValue({
      data: {
        items: [
          {
            id: "a1",
            name: "Savings",
            type: "BANK",
            currency: "USD",
            openingBalanceMinor: 50000,
            isActive: true,
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      },
      isLoading: false,
      isError: false,
    });
    financeHooks.useCreateAccountMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    financeHooks.useArchiveAccountMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  it("renders accounts from the server", () => {
    renderPage();

    expect(screen.getByText("Savings")).toBeInTheDocument();
    expect(screen.getByText("finance.accounts.newAccount")).toBeInTheDocument();
  });

  it("creates an account from the form", async () => {
    const user = userEvent.setup();
    const create = vi.fn();
    financeHooks.useCreateAccountMutation.mockReturnValue({
      mutate: create,
      isPending: false,
    });
    renderPage();

    await user.type(
      screen.getByPlaceholderText("finance.accounts.namePlaceholder"),
      "Cash",
    );
    await user.click(
      screen.getByRole("button", { name: "finance.accounts.create" }),
    );

    expect(create).toHaveBeenCalled();
    const input = create.mock.calls[0]?.[0] as { name: string };
    expect(input.name).toBe("Cash");
  });
});