import { AreaChart, BarChart } from "@mantine/charts";
import {
  Badge,
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
  MetricCard,
  PageHeader,
} from "@fondo/ui";

import {
  DateRangeSelector,
  type DateRange,
  type PeriodKey,
} from "../../components/DateRangeSelector";
import { useAppPreferences } from "../../app/preferences";
import {
  categorySpend,
  convertFromUsd,
  financeSummary,
  monthlyCashFlow,
  formatMinorAmount,
} from "../personal-finance/mock-data";

export function ReportsPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { displayCurrency } = useAppPreferences();
  const [period, setPeriod] = useState<PeriodKey>("currentMonth");
  const [customRange, setCustomRange] = useState<DateRange>([null, null]);
  const locale = i18n.language === "en" ? "en-US" : "es-ES";
  const reportData = monthlyCashFlow.map((month) => ({
    ...month,
    income: convertFromUsd(month.income, displayCurrency) / 100,
    expenses: convertFromUsd(month.expenses, displayCurrency) / 100,
  }));
  const categoryData = categorySpend.map((category) => ({
    category: t(`finance.categories.${category.name}`),
    amount: convertFromUsd(category.amount, displayCurrency) / 100,
  }));

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
          <Badge color="signal" variant="light" visibleFrom="sm">
            {t("reports.mockData")}
          </Badge>
        </Group>
      </Card>

      <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="md">
        <MetricCard
          label={t("reports.metrics.income")}
          value={formatMinorAmount(
            financeSummary.incomeMinor,
            displayCurrency,
            locale,
          )}
          detail={t("reports.metrics.period")}
          trend="+8.4%"
          icon={IconArrowUpRight}
          tone="green"
        />
        <MetricCard
          label={t("reports.metrics.expenses")}
          value={formatMinorAmount(
            financeSummary.expenseMinor,
            displayCurrency,
            locale,
          )}
          detail={t("reports.metrics.period")}
          trend="-3.1%"
          icon={IconArrowDownRight}
          tone="coral"
        />
        <MetricCard
          label={t("reports.metrics.savings")}
          value={formatMinorAmount(
            financeSummary.savingsMinor,
            displayCurrency,
            locale,
          )}
          detail={t("reports.metrics.netFlow")}
          trend="+12.8%"
          icon={IconReportAnalytics}
          tone="violet"
        />
        <MetricCard
          label={t("reports.metrics.savingsRate")}
          value={`${financeSummary.savingsRate}%`}
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
            <AreaChart
              h={280}
              data={reportData}
              dataKey="month"
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
          </DashboardSection>
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 5 }}>
          <DashboardSection
            title={t("reports.category.title")}
            eyebrow={t("reports.category.eyebrow")}
          >
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
    </Stack>
  );
}
