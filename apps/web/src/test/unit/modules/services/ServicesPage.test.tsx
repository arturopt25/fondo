import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fondoTheme } from "@fondo/ui";

const servicesHooks = vi.hoisted(() => ({
  useServicesQuery: vi.fn(),
  useEnableServiceMutation: vi.fn(),
  useConfigureServiceMutation: vi.fn(),
  useDisableServiceMutation: vi.fn(),
}));
const meHooks = vi.hoisted(() => ({ useMeQuery: vi.fn() }));

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

  return { useTranslation: () => ({ t: translate }) };
});
vi.mock("../../../../modules/settings/me-hooks", () => ({
  useMeQuery: meHooks.useMeQuery,
}));
vi.mock("../../../../modules/services/services-hooks", () => ({
  useServicesQuery: servicesHooks.useServicesQuery,
  useEnableServiceMutation: servicesHooks.useEnableServiceMutation,
  useConfigureServiceMutation: servicesHooks.useConfigureServiceMutation,
  useDisableServiceMutation: servicesHooks.useDisableServiceMutation,
}));

import { ServicesPage } from "../../../../modules/services/ServicesPage";

function renderServices() {
  return render(
    <MantineProvider theme={fondoTheme}>
      <MemoryRouter>
        <ServicesPage />
      </MemoryRouter>
    </MantineProvider>,
  );
}

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
          name: "Cuentas y saldos",
          description: "",
          required: true,
          defaultEnabled: true,
          dependsOn: [],
        },
        {
          key: "budgets",
          name: "Presupuestos",
          description: "",
          required: false,
          defaultEnabled: true,
          dependsOn: ["expenses"],
        },
      ],
      selectedCapabilities: ["accounts", "budgets"],
    },
    {
      key: "VEHICLE",
      name: "Vehicle",
      description: "V",
      status: "DISABLED",
      ledgerMode: "SHARED",
      capabilities: [
        {
          key: "vehicles",
          name: "Vehículos",
          description: "",
          required: true,
          defaultEnabled: true,
          dependsOn: [],
        },
        {
          key: "fuel",
          name: "Combustible y consumo",
          description: "",
          required: false,
          defaultEnabled: true,
          dependsOn: ["vehicles", "mileage"],
        },
      ],
      selectedCapabilities: [],
    },
  ],
};

function baseMutations() {
  return {
    useEnableServiceMutation: () => ({ mutate: vi.fn(), isPending: false }),
    useConfigureServiceMutation: () => ({ mutate: vi.fn(), isPending: false }),
    useDisableServiceMutation: () => ({ mutate: vi.fn(), isPending: false }),
  };
}

describe("ServicesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicesHooks.useServicesQuery.mockReturnValue({
      data: catalog,
      isLoading: false,
      isError: false,
    });
    servicesHooks.useEnableServiceMutation.mockReturnValue(
      baseMutations().useEnableServiceMutation(),
    );
    servicesHooks.useConfigureServiceMutation.mockReturnValue(
      baseMutations().useConfigureServiceMutation(),
    );
    servicesHooks.useDisableServiceMutation.mockReturnValue(
      baseMutations().useDisableServiceMutation(),
    );
  });

  it("renders the catalog with localized names and statuses", () => {
    meHooks.useMeQuery.mockReturnValue({
      data: { membership: { role: "ADMIN" } },
    });
    renderServices();

    expect(screen.getByText("Finanzas personales")).toBeInTheDocument();
    expect(screen.getByText("Vehículo")).toBeInTheDocument();
    expect(screen.getByText("Activo")).toBeInTheDocument();
    expect(screen.getByText("Desactivado")).toBeInTheDocument();
  });

  it("lets an ADMIN activate and configure a disabled service", async () => {
    const user = userEvent.setup();
    const enable = vi.fn();
    meHooks.useMeQuery.mockReturnValue({
      data: { membership: { role: "ADMIN" } },
    });
    servicesHooks.useEnableServiceMutation.mockReturnValue({
      mutate: enable,
      isPending: false,
    });
    renderServices();

    const activateButtons = screen.getAllByRole("button", {
      name: "Activar",
    });
    await user.click(activateButtons[0] ?? document.body);

    expect(
      screen.getByText("Configura tu servicio de Vehículo"),
    ).toBeInTheDocument();
    expect(screen.getByText("Vehículos")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Activar servicio" }));

    expect(enable).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "VEHICLE",
        capabilities: ["vehicles"],
        ledgerMode: "SHARED",
      }),
      expect.anything(),
    );
  });

  it("prevents a MEMBER from activating services", () => {
    meHooks.useMeQuery.mockReturnValue({
      data: { membership: { role: "MEMBER" } },
    });
    renderServices();

    const activateButton = screen.getAllByRole("button", {
      name: "Activar",
    })[0];
    expect(activateButton).toBeDisabled();
  });
});
