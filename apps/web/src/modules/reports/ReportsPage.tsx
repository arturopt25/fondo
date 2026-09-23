import { AreaChart, BarChart } from "@mantine/charts";
import {
  Button,
  Card,
  Grid,
  Group,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconDownload,
  IconReportAnalytics,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  DashboardSection,
  EmptyState,
  ErrorState,
  LoadingState,
  MetricCard,
  PageHeader,
} from "@fondo/ui";

import {
  DateRangeSelector,
  type DateRange,
  type PeriodKey,
} from "../../components/DateRangeSelector";
import { useAppPreferences } from "../../app/preferences";
import { formatMinorAmount } from "../../lib/money";
import {
  resolvePeriodRange,
  useCategorySpendQuery,
  useDashboardReportQuery,
} from "../finance/reports-hooks";

const SPEND_COLORS = ["#2ad6d7", "#a78bfa", "#f6a66a", "#f4778a", "#65777b"];

export function ReportsPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { displayCurrency } = useAppPreferences();
  const [period, setPeriod] = useState<PeriodKey>("currentMonth");
  const [customRange, setCustomRange] = useState<DateRange>([null, null]);
  const locale = i18n.language === "en" ? "en-US" : "es-ES";

  const range = resolvePeriodRange(period, customRange);
  const reportQuery = useDashboardReportQuery(range);
  const categorySpendQuery = useCategorySpendQuery(range);

  return (
    <Stack className="page-stack" gap="xl">
      <PageHeader
        eyebrow={t("reports.eyebrow")}
        title={t("reports.title")}
        description={t("reports.description")}
        rightSection={
          <Group gap="sm">
            <DateRangeSelector
              value={period}
              onChange={setPeriod}
              range={customRange}
              onRangeChange={setCustomRange}
            />
            <Button variant="default" leftSection={<IconDownload size={16} />}>
              {t("reports.export")}
            </Button>
          </Group>
        }
      />

      {reportQuery.isLoading ? (
        <LoadingState label={t("common.loading")} />
      ) : reportQuery.isError ? (
        <ErrorState title={t("finance.errors.loadFailedTitle")} />
      ) : reportQuery.data ? (
        <ReportsContent
          report={reportQuery.data}
          categorySpend={categorySpendQuery.data?.items ?? []}
          displayCurrency={displayCurrency}
          locale={locale}
        />
      ) : null}
    </Stack>
  );
}

function ReportsContent({
  report,
  categorySpend,
  displayCurrency,
  locale,
}: {
  readonly report: NonNullable<
    ReturnType<typeof useDashboardReportQuery>["data"]
  >;
  readonly categorySpend: readonly {
    readonly categoryId: string;
    readonly categoryName: string;
    readonly amountMinor: number;
  }[];
  readonly displayCurrency: "USD" | "EUR";
  readonly locale: string;
}): React.JSX.Element {
  const { t } = useTranslation();
  const rate = report.exchangeRate;
  const summary = report.summary;

  const reportData = report.cashFlow.map((point) => ({
    bucket: point.bucket,
    income: convert(point.incomeMinor, rate) / 100,
    expenses: convert(point.expenseMinor, rate) / 100,
  }));
  const categoryData = categorySpend.map((category, index) => ({
    category: categoryNameLabel(category.categoryName, t),
    amount: convert(category.amountMinor, rate) / 100,
    color: SPEND_COLORS[index % SPEND_COLORS.length],
  }));

  return (
    <>
      <Card className="report-intro" padding="xl" radius="lg" withBorder>
        <Group justify="space-between" align="center" wrap="nowrap">
          <Group gap="md" wrap="nowrap">
            <div className="report-intro__icon">
              <IconReportAnalytics size={23} stroke={1.5} />
            </div>
            <Stack gap={3}>
              <Text fw={700}>{t("reports.periodTitle")}</Text>
              <Text size="sm" c="dimmed">
                {t("reports.periodDescription")}
              </Text>
            </Stack>
          </Group>
        </Group>
      </Card>

      <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="md">
        <MetricCard
          label={t("reports.metrics.income")}
          value={formatMinorAmount(
            summary.incomeMinor,
            displayCurrency,
            rate,
            locale,
          )}
          detail={t("reports.metrics.period")}
          icon={IconArrowUpRight}
          tone="green"
        />
        <MetricCard
          label={t("reports.metrics.expenses")}
          value={formatMinorAmount(
            summary.expenseMinor,
            displayCurrency,
            rate,
            locale,
          )}
          detail={t("reports.metrics.period")}
          icon={IconArrowDownRight}
          tone="coral"
        />
        <MetricCard
          label={t("reports.metrics.savings")}
          value={formatMinorAmount(
            summary.savingsMinor,
            displayCurrency,
            rate,
            locale,
          )}
          detail={t("reports.metrics.netFlow")}
          icon={IconReportAnalytics}
          tone="violet"
        />
        <MetricCard
          label={t("reports.metrics.savingsRate")}
          value={`${summary.savingsRate}%`}
          detail={t("reports.metrics.ofIncome")}
          icon={IconReportAnalytics}
          tone="cyan"
        />
      </SimpleGrid>

      <Grid gutter="md" align="stretch">
        <Grid.Col span={{ base: 12, lg: 7 }}>
          <DashboardSection
            title={t("reports.cashFlow.title")}
            eyebrow={t("reports.cashFlow.eyebrow")}
          >
            {reportData.length > 0 ? (
              <AreaChart
                h={280}
                data={reportData}
                dataKey="bucket"
                series={[
                  {
                    name: "income",
                    label: t("reports.chart.income"),
                    color: "signal.4",
                  },
                  {
                    name: "expenses",
                    label: t("reports.chart.expenses"),
                    color: "orange.4",
                  },
                ]}
                curveType="natural"
                gridAxis="xy"
                withLegend
                withTooltip
              />
            ) : (
              <EmptyState
                title={t("reports.cashFlow.emptyTitle")}
                description={t("reports.cashFlow.emptyDescription")}
              />
            )}
          </DashboardSection>
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 5 }}>
          <DashboardSection
            title={t("reports.category.title")}
            eyebrow={t("reports.category.eyebrow")}
          >
            {categoryData.length > 0 ? (
              <BarChart
                h={280}
                data={categoryData}
                dataKey="category"
                series={[
                  {
                    name: "amount",
                    label: t("reports.category.spent"),
                    color: "signal.5",
                  },
                ]}
                tickLine="y"
                gridAxis="x"
                withTooltip
                withYAxis={false}
              />
            ) : (
              <EmptyState
                title={t("reports.category.emptyTitle")}
                description={t("reports.category.emptyDescription")}
              />
            )}
          </DashboardSection>
        </Grid.Col>
      </Grid>

      <DashboardSection
        title={t("reports.future.title")}
        eyebrow={t("reports.future.eyebrow")}
      >
        <EmptyState
          title={t("reports.future.emptyTitle")}
          description={t("reports.future.emptyDescription")}
        />
      </DashboardSection>
    </>
  );
}

function convert(amountMinor: number, rate: { rate: number } | null): number {
  return rate ? Math.round(amountMinor * rate.rate) : amountMinor;
}

function categoryNameLabel(
  name: string,
  t: ReturnType<typeof useTranslation>["t"],
): string {
  return t(`finance.categories.${name.toLowerCase()}`, {
    defaultValue: name,
  });
}
