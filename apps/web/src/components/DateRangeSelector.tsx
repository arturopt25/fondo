import { SegmentedControl } from "@mantine/core";
import { useTranslation } from "react-i18next";

export type PeriodKey =
  "currentMonth" | "previousMonth" | "currentYear" | "custom";

interface DateRangeSelectorProps {
  readonly value: PeriodKey;
  readonly onChange: (value: PeriodKey) => void;
}

export function DateRangeSelector({
  value,
  onChange,
}: DateRangeSelectorProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <SegmentedControl
      className="date-range-selector"
      value={value}
      onChange={(nextValue) => onChange(nextValue as PeriodKey)}
      data={[
        { label: t("period.currentMonth"), value: "currentMonth" },
        { label: t("period.previousMonth"), value: "previousMonth" },
        { label: t("period.currentYear"), value: "currentYear" },
        { label: t("period.custom"), value: "custom" },
      ]}
    />
  );
}
