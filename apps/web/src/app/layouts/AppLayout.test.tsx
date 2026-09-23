import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fondoTheme } from "@fondo/ui";

const auth = vi.hoisted(() => ({ useAuth: vi.fn() }));
const servicesHooks = vi.hoisted(() => ({ useServicesQuery: vi.fn() }));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("../../modules/auth/auth-context", () => ({ useAuth: auth.useAuth }));
vi.mock("../../modules/services/services-hooks", () => ({
  useServicesQuery: servicesHooks.useServicesQuery,
}));

import { AppLayout } from "./AppLayout";

function renderLayout() {
  return render(
    <MantineProvider theme={fondoTheme}>
      <MemoryRouter initialEntries={["/app/dashboard"]}>
        <AppLayout />
      </MemoryRouter>
    </MantineProvider>,
  );
}

describe("AppLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.useAuth.mockReturnValue({
      session: {
        user: { name: "Arturo", email: "arturo@example.com", image: null },
      },
      signOut: vi.fn().mockResolvedValue(undefined),
    });
    servicesHooks.useServicesQuery.mockReturnValue({
      data: { services: [{ key: "PERSONAL_FINANCE", status: "ACTIVE" }] },
    });
  });

  it("renders the main navigation and the user", () => {
    renderLayout();

    expect(screen.getAllByText("navigation.dashboard").length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText("navigation.reports")).toBeInTheDocument();
    expect(screen.getByText("navigation.settings")).toBeInTheDocument();
    expect(screen.getAllByText("Arturo").length).toBeGreaterThan(0);
  });
});
