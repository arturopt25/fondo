import { SimpleGrid, Stack, Text } from "@mantine/core";
import {
  IconBuildingBank,
  IconCar,
  IconHome2,
  IconReceiptTax,
  IconShieldCheck,
} from "@tabler/icons-react";
import type { TablerIcon } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import type { ServiceKey, ServiceWithStatus } from "@fondo/shared-types";
import { EmptyState, ErrorState, LoadingState, PageHeader, ServiceCard } from "@fondo/ui";

import { useMeQuery } from "../settings/me-hooks";
import {
  useDisableServiceMutation,
  useEnableServiceMutation,
  useServicesQuery,
} from "./services-hooks";

const serviceMeta: Record<
  ServiceKey,
  { readonly icon: TablerIcon; readonly statusColor: string }
> = {
  PERSONAL_FINANCE: { icon: IconBuildingBank, statusColor: "teal" },
  VEHICLE: { icon: IconCar, statusColor: "gray" },
  HOME: { icon: IconHome2, statusColor: "gray" },
  INSURANCE: { icon: IconShieldCheck, statusColor: "gray" },
  ENTREPRENEURSHIP: { icon: IconReceiptTax, statusColor: "gray" },
};

export function ServicesPage(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const servicesQuery = useServicesQuery();
  const enableService = useEnableServiceMutation();
  const disableService = useDisableServiceMutation();
  const meQuery = useMeQuery();

  const isAdmin = meQuery.data?.membership.role === "ADMIN";
  const services = servicesQuery.data?.services ?? [];

  function handleAction(service: ServiceWithStatus): void {
    if (service.status === "ACTIVE" && service.key === "PERSONAL_FINANCE") {
      navigate("/app/dashboard");
      return;
    }

    if (service.status === "ACTIVE") {
      disableService.mutate(service.key);
      return;
    }

    enableService.mutate(service.key);
  }

  function actionLabel(service: ServiceWithStatus): string {
    if (service.status === "ACTIVE" && service.key === "PERSONAL_FINANCE") {
      return t("services.actions.open");
    }
    if (service.status === "ACTIVE") {
      return t("services.actions.disable");
    }
    return t("services.actions.enable");
  }

  function isActionDisabled(service: ServiceWithStatus): boolean {
    if (service.status === "ACTIVE") {
      return !isAdmin && service.key !== "PERSONAL_FINANCE";
    }
    return !isAdmin;
  }

  function statusFor(service: ServiceWithStatus): string {
    if (service.status === "ACTIVE") {
      return t("services.status.active");
    }
    return t("services.status.disabled");
  }

  return (
    <Stack className="page-stack" gap="xl">
      <PageHeader
        eyebrow={t("services.eyebrow")}
        title={t("services.pageTitle")}
        description={t("services.pageDescription")}
      />
      <div className="services-intro">
        <Text className="eyebrow" size="xs">
          {t("services.introEyebrow")}
        </Text>
        <Text size="sm" c="dimmed" maw={680} mt={6}>
          {t("services.introDescription")}
        </Text>
      </div>

      {servicesQuery.isLoading ? (
        <LoadingState label={t("common.loading")} />
      ) : servicesQuery.isError ? (
        <ErrorState
          title={t("services.errors.loadFailedTitle")}
          description={t("services.errors.loadFailed")}
        />
      ) : services.length === 0 ? (
        <EmptyState
          title={t("services.errors.emptyTitle")}
          description={t("services.errors.emptyDescription")}
        />
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {services.map((service) => {
            const meta = serviceMeta[service.key] ?? {
              icon: IconBuildingBank,
              statusColor: "gray",
            };
            const pending =
              (enableService.isPending &&
                enableService.variables === service.key) ||
              (disableService.isPending &&
                disableService.variables === service.key);

            return (
              <ServiceCard
                key={service.key}
                name={service.name}
                description={service.description}
                status={statusFor(service)}
                statusColor={meta.statusColor}
                icon={meta.icon}
                actionLabel={actionLabel(service)}
                disabled={isActionDisabled(service) || pending}
                onAction={() => handleAction(service)}
              />
            );
          })}
        </SimpleGrid>
      )}
    </Stack>
  );
}