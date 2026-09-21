import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fondoTheme } from "@fondo/ui";

const servicesHooks = vi.hoisted(() => ({
  useServicesQuery: vi.fn(),
  useEnableServiceMutation: vi.fn(),
  useDisableServiceMutation: vi.fn(),
}));
const meHooks = vi.hoisted(() => ({ useMeQuery: vi.fn() }));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("../settings/me-hooks", () => ({
  useMeQuery: meHooks.useMeQuery,
}));
vi.mock("./services-hooks", () => ({
  useServicesQuery: servicesHooks.useServicesQuery,
  useEnableServiceMutation: servicesHooks.useEnableServiceMutation,
  useDisableServiceMutation: servicesHooks.useDisableServiceMutation,
}));

import { ServicesPage } from "./ServicesPage";

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
    },
    {
      key: "VEHICLE",
      name: "Vehicle",
      description: "V",
      status: "DISABLED",
    },
  ],
};

describe("ServicesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicesHooks.useServicesQuery.mockReturnValue({
      data: catalog,
      isLoading: false,
      isError: false,
    });
    servicesHooks.useEnableServiceMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    servicesHooks.useDisableServiceMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  it("renders the catalog from the server", () => {
    meHooks.useMeQuery.mockReturnValue({
      data: { membership: { role: "ADMIN" } },
    });
    renderServices();

    expect(screen.getByText("Personal Finance")).toBeInTheDocument();
    expect(screen.getByText("Vehicle")).toBeInTheDocument();
    expect(screen.getAllByText("services.status.active").length).toBeGreaterThan(
      0,
    );
  });

  it("lets an ADMIN enable a disabled service", async () => {
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

    const enableButtons = screen.getAllByRole("button", {
      name: "services.actions.enable",
    });
    await user.click(enableButtons[0] ?? document.body);

    expect(enable).toHaveBeenCalledWith("VEHICLE");
  });

  it("prevents a MEMBER from enabling a service", () => {
    meHooks.useMeQuery.mockReturnValue({
      data: { membership: { role: "MEMBER" } },
    });
    renderServices();

    const enableButton = screen.getByRole("button", {
      name: "services.actions.enable",
    });
    expect(enableButton).toBeDisabled();
  });
});