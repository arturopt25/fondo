import {
  IconBuildingBank,
  IconCar,
  IconHome2,
  IconReceiptTax,
  IconShieldCheck,
  type TablerIcon,
} from "@tabler/icons-react";

import type {
  ServiceCapability,
  ServiceKey,
  ServiceWithCapabilities,
} from "@fondo/shared-types";

export const serviceMeta: Record<
  ServiceKey,
  { readonly icon: TablerIcon; readonly statusColor: string }
> = {
  PERSONAL_FINANCE: { icon: IconBuildingBank, statusColor: "teal" },
  VEHICLE: { icon: IconCar, statusColor: "gray" },
  HOME: { icon: IconHome2, statusColor: "gray" },
  INSURANCE: { icon: IconShieldCheck, statusColor: "gray" },
  ENTREPRENEURSHIP: { icon: IconReceiptTax, statusColor: "gray" },
};

export const serviceCardKey: Record<ServiceKey, string> = {
  PERSONAL_FINANCE: "personalFinance",
  VEHICLE: "vehicle",
  HOME: "home",
  INSURANCE: "insurance",
  ENTREPRENEURSHIP: "entrepreneurship",
};

export function cardKeyOf(key: ServiceKey): string {
  return serviceCardKey[key] ?? key.toLowerCase();
}

export function activeCapabilities(
  service: ServiceWithCapabilities,
): ServiceCapability[] {
  const selected = new Set(service.selectedCapabilities);
  return service.capabilities.filter(
    (capability) =>
      capability.required || selected.has(capability.key),
  );
}