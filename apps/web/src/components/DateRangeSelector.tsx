import { SegmentedControl, Stack } from "@mantine/core";
import { DatePicker } from "@mantine/dates";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export type PeriodKey =
  "currentMonth" | "previousMonth" | "currentYear" | "custom";

export type DateRange = [Date | null, Date | null];

interface DateRangeSelectorProps {
  readonly value: PeriodKey;
  readonly onChange: (value: PeriodKey) => void;
  readonly range?: DateRange;
  readonly onRangeChange?: (range: DateRange) => void;
}

export function DateRangeSelector({
  value,
  onChange,
  range,
  onRangeChange,
}: DateRangeSelectorProps): React.JSX.Element {
  const { t } = useTranslation();
  const [internalRange, setInternalRange] = useState<DateRange>([null, null]);
  const resolvedRange = range ?? internalRange;

  return (
    <Stack gap="xs" align="flex-end">
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
      {value === "custom" ? (
        <DatePicker
          type="range"
          value={resolvedRange}
          onChange={(nextRange) => {
            const raw = (nextRange ?? [null, null]) as readonly (Date | string | null)[];
            const toDate = (value: Date | string | null | undefined): Date | null =>
              typeof value === "string" ? new Date(value) : (value ?? null);
            const next: DateRange = [toDate(raw[0]), toDate(raw[1])];
            if (range) {
              onRangeChange?.(next);
            } else {
              setInternalRange(next);
            }
          }}
        />
      ) : null}
    </Stack>
  );
}