import { Text } from "@mantine/core";

export interface CurrencyAmountProps {
  readonly amountMinor: number;
  readonly currency: string;
  readonly locale?: string;
  readonly className?: string;
}

export function CurrencyAmount({
  amountMinor,
  currency,
  locale = "en-US",
  className,
}: CurrencyAmountProps): React.JSX.Element {
  const value = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);

  return (
    <Text {...(className ? { className } : {})} component="span" ff="monospace">
      {value}
    </Text>
  );
}
