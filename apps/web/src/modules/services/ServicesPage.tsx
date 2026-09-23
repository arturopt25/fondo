import {
  Button,
  Checkbox,
  Group,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconBuildingBank,
  IconCar,
  IconHome2,
  IconReceiptTax,
  IconShieldCheck,
} from "@tabler/icons-react";
import type { TablerIcon } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import type {
  ServiceKey,
  ServiceLedgerMode,
  ServiceWithCapabilities,
} from "@fondo/shared-types";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  ServiceCard,
} from "@fondo/ui";

import { useMeQuery } from "../settings/me-hooks";
import {
  useConfigureServiceMutation,
  useDisableServiceMutation,
  useEnableServiceMutation,
  useServicesQuery,
  type EnableServiceInput,
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

const serviceCardKey: Record<ServiceKey, string> = {
  PERSONAL_FINANCE: "personalFinance",
  VEHICLE: "vehicle",
  HOME: "home",
  INSURANCE: "insurance",
  ENTREPRENEURSHIP: "entrepreneurship",
};

interface ServiceMutations {
  readonly enable: {
    readonly isPending: boolean;
    readonly variables?: EnableServiceInput | null | undefined;
  };
  readonly configure: {
    readonly isPending: boolean;
    readonly variables?: EnableServiceInput | null | undefined;
  };
  readonly disable: {
    readonly isPending: boolean;
    readonly variables?: ServiceKey | null | undefined;
  };
}

export function ServicesPage(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const servicesQuery = useServicesQuery();
  const enableService = useEnableServiceMutation();
  const configureService = useConfigureServiceMutation();
  const disableService = useDisableServiceMutation();
  const meQuery = useMeQuery();

  const isAdmin = meQuery.data?.membership.role === "ADMIN";
  const services = servicesQuery.data?.services ?? [];

  const [configureFor, setConfigureFor] =
    useState<ServiceWithCapabilities | null>(null);
  const [opened, { open, close }] = useDisclosure(false);

  function openConfig(service: ServiceWithCapabilities): void {
    setConfigureFor(service);
    open();
  }

  function closeConfig(): void {
    close();
    setConfigureFor(null);
  }

  function handleAction(service: ServiceWithCapabilities): void {
    if (service.status === "ACTIVE" && service.key === "PERSONAL_FINANCE") {
      navigate("/app/dashboard");
      return;
    }
    if (service.status === "ACTIVE") {
      disableService.mutate(service.key);
      return;
    }
    openConfig(service);
  }

  function handleServiceConfigSave(
    capabilities: string[],
    ledgerMode: ServiceLedgerMode,
  ): void {
    if (!configureFor) {
      return;
    }
    const input: EnableServiceInput = {
      key: configureFor.key,
      capabilities,
      ledgerMode,
    };
    if (configureFor.status === "ACTIVE") {
      configureService.mutate(input, { onSuccess: closeConfig });
    } else {
      enableService.mutate(input, { onSuccess: closeConfig });
    }
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
          {services.map((service) => (
            <ServiceCatalogCard
              key={service.key}
              service={service}
              isAdmin={isAdmin}
              isPending={isServiceMutationPending(service.key, {
                enable: enableService,
                configure: configureService,
                disable: disableService,
              })}
              onAction={handleAction}
              onOpenConfig={openConfig}
            />
          ))}
        </SimpleGrid>
      )}

      {configureFor ? (
        <ServiceConfigModal
          service={configureFor}
          opened={opened}
          isPending={enableService.isPending || configureService.isPending}
          onClose={closeConfig}
          onSave={handleServiceConfigSave}
        />
      ) : null}
    </Stack>
  );
}

function ServiceCatalogCard({
  service,
  isAdmin,
  isPending,
  onAction,
  onOpenConfig,
}: {
  readonly service: ServiceWithCapabilities;
  readonly isAdmin: boolean;
  readonly isPending: boolean;
  readonly onAction: (service: ServiceWithCapabilities) => void;
  readonly onOpenConfig: (service: ServiceWithCapabilities) => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const meta = serviceMeta[service.key] ?? {
    icon: IconBuildingBank,
    statusColor: "gray",
  };
  const cardKey = serviceCardKey[service.key] ?? service.key.toLowerCase();
  const showSettings = isAdmin && service.status === "ACTIVE";

  return (
    <ServiceCard
      name={t(`services.cards.${cardKey}.name`, {
        defaultValue: service.name,
      })}
      description={t(`services.cards.${cardKey}.description`, {
        defaultValue: service.description,
      })}
      status={
        service.status === "ACTIVE"
          ? t("services.status.active")
          : t("services.status.disabled")
      }
      statusColor={meta.statusColor}
      icon={meta.icon}
      actionLabel={
        service.status === "ACTIVE" && service.key === "PERSONAL_FINANCE"
          ? t("services.actions.open")
          : service.status === "ACTIVE"
            ? t("services.actions.disable")
            : t("services.actions.configure")
      }
      disabled={!isAdmin || isPending}
      onAction={() => onAction(service)}
      {...(showSettings ? { onSettings: () => onOpenConfig(service) } : {})}
    />
  );
}

function isServiceMutationPending(
  serviceKey: ServiceKey,
  mutations: ServiceMutations,
): boolean {
  return (
    (mutations.enable.isPending &&
      mutations.enable.variables?.key === serviceKey) ||
    (mutations.configure.isPending &&
      mutations.configure.variables?.key === serviceKey) ||
    (mutations.disable.isPending &&
      mutations.disable.variables === serviceKey)
  );
}

function ServiceConfigModal({
  service,
  opened,
  isPending,
  onClose,
  onSave,
}: {
  readonly service: ServiceWithCapabilities;
  readonly opened: boolean;
  readonly isPending: boolean;
  readonly onClose: () => void;
  readonly onSave: (
    capabilities: string[],
    ledgerMode: ServiceLedgerMode,
  ) => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const cardKey = serviceCardKey[service.key] ?? service.key.toLowerCase();
  const localizedName = t(`services.cards.${cardKey}.name`, {
    defaultValue: service.name,
  });
  const [selected, setSelected] = useState<Set<string>>(() => {
    const initial = new Set(service.selectedCapabilities);
    for (const capability of service.capabilities) {
      if (capability.required) {
        initial.add(capability.key);
      }
    }
    return initial;
  });
  const [ledgerMode, setLedgerMode] = useState<ServiceLedgerMode>(
    service.ledgerMode,
  );

  function toggleCapability(key: string): void {
    const next = new Set(selected);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelected(next);
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t("services.configure.title", { name: localizedName })}
      size="lg"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {t("services.configure.description")}
        </Text>
        <Stack gap="xs">
          {service.capabilities.map((capability) => {
            const required = capability.required;
            return (
              <Checkbox
                key={capability.key}
                label={t(
                  `services.capabilities.${cardKey}.${capability.key}.name`,
                  { defaultValue: capability.name },
                )}
                description={t(
                  `services.capabilities.${cardKey}.${capability.key}.description`,
                  { defaultValue: capability.description },
                )}
                checked={required || selected.has(capability.key)}
                disabled={required}
                onChange={() => toggleCapability(capability.key)}
              />
            );
          })}
        </Stack>
        {service.key === "ENTREPRENEURSHIP" ? (
          <Select
            label={t("services.configure.ledgerModeLabel")}
            description={t("services.configure.ledgerModeDescription")}
            value={ledgerMode}
            onChange={(value) =>
              setLedgerMode((value ?? "SHARED") as ServiceLedgerMode)
            }
            data={[
              { value: "SHARED", label: t("services.ledgerModes.SHARED") },
              {
                value: "SEPARATE",
                label: t("services.ledgerModes.SEPARATE"),
              },
            ]}
          />
        ) : null}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t("services.configure.cancel")}
          </Button>
          <Button
            color="signal"
            loading={isPending}
            onClick={() => onSave([...selected], ledgerMode)}
          >
            {service.status === "ACTIVE"
              ? t("services.configure.save")
              : t("services.configure.enable")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}