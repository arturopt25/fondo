import { SimpleGrid, Stack, Text } from "@mantine/core";
import {
  IconBuildingBank,
  IconCar,
  IconHome2,
  IconReceiptTax,
  IconShieldCheck,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { PageHeader, ServiceCard } from "@fondo/ui";

const serviceCards = [
  {
    key: "personalFinance",
    icon: IconBuildingBank,
    statusColor: "teal",
    enabled: true,
  },
  { key: "vehicle", icon: IconCar, statusColor: "gray", enabled: false },
  { key: "home", icon: IconHome2, statusColor: "gray", enabled: false },
  {
    key: "insurance",
    icon: IconShieldCheck,
    statusColor: "gray",
    enabled: false,
  },
  {
    key: "entrepreneurship",
    icon: IconReceiptTax,
    statusColor: "gray",
    enabled: false,
  },
] as const;

export function ServicesPage(): React.JSX.Element {
  const { t } = useTranslation();

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
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        {serviceCards.map((service) => (
          <ServiceCard
            key={service.key}
            name={t(`services.cards.${service.key}.name`)}
            description={t(`services.cards.${service.key}.description`)}
            status={t(
              `services.cards.${service.key}.${service.enabled ? "active" : "comingSoon"}`,
            )}
            statusColor={service.statusColor}
            icon={service.icon}
            actionLabel={t(
              `services.cards.${service.key}.${service.enabled ? "open" : "notify"}`,
            )}
            disabled={!service.enabled}
          />
        ))}
      </SimpleGrid>
    </Stack>
  );
}
