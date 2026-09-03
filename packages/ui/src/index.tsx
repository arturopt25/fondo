import { Text } from "@mantine/core";
import type { JSX } from "react";

export { fondoTheme } from "./theme.js";
export { CurrencyAmount } from "./components/CurrencyAmount.js";
export { DashboardSection } from "./components/DashboardSection.js";
export { EmptyState } from "./components/EmptyState.js";
export { MetricCard } from "./components/MetricCard.js";
export { PageHeader } from "./components/PageHeader.js";
export { ServiceCard } from "./components/ServiceCard.js";
export type { CurrencyAmountProps } from "./components/CurrencyAmount.js";
export type { DashboardSectionProps } from "./components/DashboardSection.js";
export type { EmptyStateProps } from "./components/EmptyState.js";
export type { MetricCardProps } from "./components/MetricCard.js";
export type { PageHeaderProps } from "./components/PageHeader.js";
export type { ServiceCardProps } from "./components/ServiceCard.js";

export interface FondoBrandProps {
  readonly label?: string;
  readonly size?: "sm" | "md" | "lg";
}

export function FondoBrand({
  label = "Fondo",
  size = "md",
}: FondoBrandProps): JSX.Element {
  return (
    <Text fw={700} size={size} component="span">
      {label}
    </Text>
  );
}
