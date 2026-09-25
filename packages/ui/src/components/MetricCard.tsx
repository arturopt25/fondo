import { Card, Group, Stack, Text } from "@mantine/core";
import type { TablerIcon } from "@tabler/icons-react";

export interface MetricCardProps {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
  readonly trend?: string;
  readonly icon: TablerIcon;
  readonly tone?: "cyan" | "green" | "coral" | "violet";
  readonly compact?: boolean;
  readonly variant?: "card" | "embedded";
}

const toneClass: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  cyan: "metric-card__icon metric-card__icon--cyan",
  green: "metric-card__icon metric-card__icon--green",
  coral: "metric-card__icon metric-card__icon--coral",
  violet: "metric-card__icon metric-card__icon--violet",
};

export function MetricCard({
  label,
  value,
  detail,
  trend,
  icon: Icon,
  tone = "cyan",
  compact = false,
  variant = "card",
}: MetricCardProps): React.JSX.Element {
  const isEmbedded = variant === "embedded";

  return (
    <Card
      className={`metric-card${compact ? " metric-card--compact" : ""}${
        isEmbedded ? " metric-card--embedded" : ""
      }`}
      padding={isEmbedded ? "sm" : compact ? "md" : "lg"}
      radius="lg"
      withBorder={!isEmbedded}
    >
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Stack gap={6}>
          <Text className="eyebrow" size="xs">
            {label}
          </Text>
          <Text className="metric-card__value" component="p">
            {value}
          </Text>
          <Group gap="xs" wrap="nowrap">
            {trend ? <Text className="metric-card__trend">{trend}</Text> : null}
            <Text c="dimmed" size="xs">
              {detail}
            </Text>
          </Group>
        </Stack>
        <div className={toneClass[tone]} aria-hidden="true">
          <Icon size={compact ? 17 : 19} stroke={1.8} />
        </div>
      </Group>
    </Card>
  );
}
