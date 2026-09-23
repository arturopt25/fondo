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

  function statusFor(service: ServiceWithCapabilities): string {
    if (service.status === "ACTIVE") {
      return t("services.status.active");
    }
    return t("services.status.disabled");
  }

  function actionLabel(service: ServiceWithCapabilities): string {
    if (service.status === "ACTIVE" && service.key === "PERSONAL_FINANCE") {
      return t("services.actions.open");
    }
    if (service.status === "ACTIVE") {
      return t("services.actions.disable");
    }
    return t("services.actions.configure");
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
            const cardKey =
              serviceCardKey[service.key] ?? service.key.toLowerCase();
            const pending =
              (enableService.isPending &&
                enableService.variables?.key === service.key) ||
              (configureService.isPending &&
                configureService.variables?.key === service.key) ||
              (disableService.isPending &&
                disableService.variables === service.key);

            return (
              <ServiceCard
                key={service.key}
                name={t(`services.cards.${cardKey}.name`, {
                  defaultValue: service.name,
                })}
                description={t(`services.cards.${cardKey}.description`, {
                  defaultValue: service.description,
                })}
                status={statusFor(service)}
                statusColor={meta.statusColor}
                icon={meta.icon}
                actionLabel={actionLabel(service)}
                disabled={!isAdmin || pending}
                onAction={() => handleAction(service)}
                {...(isAdmin && service.status === "ACTIVE"
                  ? { onSettings: () => openConfig(service) }
                  : {})}
              />
            );
          })}
        </SimpleGrid>
      )}

      {configureFor ? (
        <ServiceConfigModal
          service={configureFor}
          opened={opened}
          isPending={enableService.isPending || configureService.isPending}
          onClose={() => {
            close();
            setConfigureFor(null);
          }}
          onSave={(capabilities, ledgerMode) => {
            const input = {
              key: configureFor.key,
              capabilities,
              ledgerMode,
            };
            if (configureFor.status === "ACTIVE") {
              configureService.mutate(input, {
                onSuccess: () => {
                  close();
                  setConfigureFor(null);
                },
              });
            } else {
              enableService.mutate(input, {
                onSuccess: () => {
                  close();
                  setConfigureFor(null);
                },
              });
            }
          }}
        />
      ) : null}
    </Stack>
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

  function isDisabledCapability(required: boolean): boolean {
    return required;
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
            const disabled = isDisabledCapability(capability.required);
            return (
              <Checkbox
                key={capability.key}
                label={capability.name}
                description={capability.description}
                checked={disabled || selected.has(capability.key)}
                disabled={disabled}
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
