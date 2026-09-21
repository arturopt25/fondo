import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  Card,
  Group,
  Grid,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { AreaChart, DonutChart } from "@mantine/charts";
import { notifications } from "@mantine/notifications";
import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconCalendarStats,
  IconChartDonut3,
  IconChevronRight,
  IconCircleCheck,
  IconDots,
  IconPlus,
  IconReceipt,
  IconSparkles,
  IconWallet,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

import { DashboardSection, MetricCard, PageHeader } from "@fondo/ui";

import {
  DateRangeSelector,
  type DateRange,
  type PeriodKey,
} from "../../components/DateRangeSelector";
import { useAppPreferences } from "../../app/preferences";
import {
  budgetProgress,
  categorySpend,
  convertFromUsd,
  exchangeRate,
  financeSummary,
  formatDate,
  formatMinorAmount,
  monthlyCashFlow,
  recentTransactions,
} from "../personal-finance/mock-data";

export function DashboardPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { displayCurrency } = useAppPreferences();
  const [period, setPeriod] = useState<PeriodKey>("currentMonth");
  const [customRange, setCustomRange] = useState<DateRange>([null, null]);
  const locale = i18n.language === "en" ? "en-US" : "es-ES";

  function showTransactionNotice(): void {
    notifications.show({
      title: t("dashboard.mockNoticeTitle"),
      message: t("dashboard.mockNoticeDescription"),
      color: "signal",
    });
  }

  const chartData = monthlyCashFlow.map((month) => ({
    ...month,
    income: convertFromUsd(month.income, displayCurrency) / 100,
    expenses: convertFromUsd(month.expenses, displayCurrency) / 100,
  }));
  const donutData = categorySpend.map((category) => ({
    name: t(`finance.categories.${category.name}`),
    value: convertFromUsd(category.amount, displayCurrency) / 100,
    color: category.color,
  }));

  return (
    <Stack className="page-stack" gap="xl">
      <PageHeader
        eyebrow={t("dashboard.eyebrow")}
        title={t("dashboard.title")}
        description={t("dashboard.description")}
        rightSection={
          <Group gap="sm" align="center">
            <DateRangeSelector
              value={period}
              onChange={setPeriod}
              range={customRange}
              onRangeChange={setCustomRange}
            />
            <Button
              leftSection={<IconPlus size={17} />}
              color="signal"
              onClick={showTransactionNotice}
            >
              {t("dashboard.newTransaction")}
            </Button>
          </Group>
        }
      />

      <Card className="balance-hero" padding={0} radius="lg" withBorder>
        <div className="balance-hero__glow" />
        <Grid gutter={0} align="stretch">
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Stack
              className="balance-hero__content"
              gap="md"
              p={{ base: "lg", sm: "xl" }}
            >
              <Group justify="space-between" align="flex-start">
                <Stack gap={5}>
                  <Text className="eyebrow" size="xs">
                    {t("dashboard.totalBalance")}
                  </Text>
                  <Text className="hero-balance" component="p">
                    {formatMinorAmount(
                      financeSummary.balanceMinor,
                      displayCurrency,
                      locale,
                    )}
                  </Text>
                  <Group gap="xs">
                    <Badge
                      color="teal"
                      variant="light"
                      leftSection={<IconArrowUpRight size={12} />}
                    >
                      {t("dashboard.upFromLastMonth")}
                    </Badge>
                    <Text c="dimmed" size="xs">
                      {t("dashboard.asOfToday")}
                    </Text>
                  </Group>
                </Stack>
                <ThemeIcon
                  className="hero-icon"
                  color="signal"
                  variant="light"
                  size={44}
                  radius="md"
                >
                  <IconWallet size={22} stroke={1.5} />
                </ThemeIcon>
              </Group>
              <Text c="dimmed" size="sm" maw={390} lh={1.55}>
                {t("dashboard.balanceCaption")}
              </Text>
            </Stack>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 5 }}>
            <div className="balance-hero__visual">
              <div className="balance-orbit balance-orbit--one" />
              <div className="balance-orbit balance-orbit--two" />
              <div className="balance-hero__stat">
                <Text className="eyebrow" size="xs">
                  {t("dashboard.exchangeRate")}
                </Text>
                <Text className="hero-rate">
                  1 USD = {exchangeRate.rate.toFixed(2)} EUR
                </Text>
                <Text c="dimmed" size="xs">
                  {t("dashboard.mockRate")}
                </Text>
              </div>
            </div>
          </Grid.Col>
        </Grid>
      </Card>

      <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="md">
        <MetricCard
          label={t("dashboard.metrics.income")}
          value={formatMinorAmount(
            financeSummary.incomeMinor,
            displayCurrency,
            locale,
          )}
          detail={t("dashboard.metrics.vsLastPeriod")}
          trend="+8.4%"
          icon={IconArrowUpRight}
          tone="green"
        />
        <MetricCard
          label={t("dashboard.metrics.expenses")}
          value={formatMinorAmount(
            financeSummary.expenseMinor,
            displayCurrency,
            locale,
          )}
          detail={t("dashboard.metrics.vsLastPeriod")}
          trend="-3.1%"
          icon={IconArrowDownRight}
          tone="coral"
        />
        <MetricCard
          label={t("dashboard.metrics.savings")}
          value={formatMinorAmount(
            financeSummary.savingsMinor,
            displayCurrency,
            locale,
          )}
          detail={t("dashboard.metrics.netFlow")}
          trend="+12.8%"
          icon={IconSparkles}
          tone="violet"
        />
        <MetricCard
          label={t("dashboard.metrics.savingsRate")}
          value={`${financeSummary.savingsRate}%`}
          detail={t("dashboard.metrics.ofIncome")}
          trend={t("dashboard.metrics.healthy")}
          icon={IconCalendarStats}
          tone="cyan"
        />
      </SimpleGrid>

      <Grid gutter="md" align="stretch">
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <DashboardSection
            title={t("dashboard.cashFlow.title")}
            eyebrow={t("dashboard.cashFlow.eyebrow")}
            action={
              <Button
                component={RouterLink}
                to="/app/reports"
                variant="subtle"
                color="gray"
                size="xs"
                rightSection={<IconChevronRight size={14} />}
              >
                {t("dashboard.viewReport")}
              </Button>
            }
          >
            <AreaChart
              h={270}
              data={chartData}
              dataKey="month"
              series={[
                {
                  name: "income",
                  label: t("dashboard.chart.income"),
                  color: "signal.4",
                },
                {
                  name: "expenses",
                  label: t("dashboard.chart.expenses"),
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
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <DashboardSection
            title={t("dashboard.spending.title")}
            eyebrow={t("dashboard.spending.eyebrow")}
            className="spending-section"
          >
            <Stack align="center" gap="lg">
              <DonutChart
                data={donutData}
                size={188}
                thickness={24}
                paddingAngle={4}
                withTooltip
                tooltipDataSource="segment"
              />
              <Stack gap="xs" w="100%">
                {categorySpend.slice(0, 4).map((category) => (
                  <Group key={category.name} justify="space-between" gap="sm">
                    <Group gap="xs">
                      <span
                        className="legend-dot"
                        style={{ backgroundColor: category.color }}
                      />
                      <Text size="sm">
                        {t(`finance.categories.${category.name}`)}
                      </Text>
                    </Group>
                    <Text ff="monospace" size="sm">
                      {formatMinorAmount(
                        category.amount,
                        displayCurrency,
                        locale,
                      )}
                    </Text>
                  </Group>
                ))}
              </Stack>
            </Stack>
          </DashboardSection>
        </Grid.Col>
      </Grid>

      <Grid gutter="md" align="stretch">
        <Grid.Col span={{ base: 12, lg: 7 }}>
          <DashboardSection
            title={t("dashboard.budgets.title")}
            eyebrow={t("dashboard.budgets.eyebrow")}
            action={
              <Button
                variant="subtle"
                color="gray"
                size="xs"
                rightSection={<IconChevronRight size={14} />}
              >
                {t("dashboard.viewAll")}
              </Button>
            }
          >
            <Stack gap="lg">
              {budgetProgress.map((budget) => {
                const percentage = Math.round(
                  (budget.spent / budget.limit) * 100,
                );
                const isOver = percentage > 100;

                return (
                  <Stack key={budget.name} gap={7}>
                    <Group justify="space-between">
                      <Group gap="xs">
                        <ThemeIcon
                          color={budget.color}
                          variant="light"
                          size={26}
                          radius="sm"
                        >
                          <IconChartDonut3 size={14} />
                        </ThemeIcon>
                        <Text size="sm" fw={600}>
                          {t(`finance.categories.${budget.name}`)}
                        </Text>
                      </Group>
                      <Text
                        ff="monospace"
                        size="xs"
                        c={isOver ? "orange" : "dimmed"}
                      >
                        {formatMinorAmount(
                          budget.spent,
                          displayCurrency,
                          locale,
                        )}{" "}
                        /{" "}
                        {formatMinorAmount(
                          budget.limit,
                          displayCurrency,
                          locale,
                        )}
                      </Text>
                    </Group>
                    <Progress
                      value={Math.min(percentage, 100)}
                      color={isOver ? "orange" : budget.color}
                      size="sm"
                      radius="xl"
                    />
                    <Text size="xs" c={isOver ? "orange" : "dimmed"}>
                      {isOver
                        ? t("dashboard.budgets.over", {
                            percentage: percentage - 100,
                          })
                        : t("dashboard.budgets.remaining", {
                            percentage: 100 - percentage,
                          })}
                    </Text>
                  </Stack>
                );
              })}
            </Stack>
          </DashboardSection>
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 5 }}>
          <DashboardSection
            title={t("dashboard.recent.title")}
            eyebrow={t("dashboard.recent.eyebrow")}
            action={
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label={t("dashboard.moreTransactions")}
              >
                <IconDots size={18} />
              </ActionIcon>
            }
          >
            <Stack gap="xs">
              {recentTransactions.map((transaction) => (
                <Group
                  key={transaction.id}
                  className="transaction-row"
                  justify="space-between"
                  wrap="nowrap"
                >
                  <Group gap="sm" wrap="nowrap" miw={0}>
                    <Avatar
                      color={transaction.type === "income" ? "teal" : "signal"}
                      radius="md"
                      size={34}
                    >
                      {transaction.type === "income" ? (
                        <IconCircleCheck size={17} />
                      ) : (
                        <IconReceipt size={17} />
                      )}
                    </Avatar>
                    <Stack gap={2} miw={0}>
                      <Text size="sm" fw={600} truncate>
                        {t(`finance.merchants.${transaction.merchantKey}`)}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {t(`finance.categories.${transaction.categoryKey}`)} ·{" "}
                        {formatDate(transaction.date, locale)}
                      </Text>
                    </Stack>
                  </Group>
                  <Text
                    className={
                      transaction.type === "income"
                        ? "amount-positive"
                        : "amount-negative"
                    }
                    ff="monospace"
                    size="sm"
                    fw={600}
                  >
                    {transaction.amountMinor > 0 ? "+" : ""}
                    {formatMinorAmount(
                      transaction.amountMinor,
                      displayCurrency,
                      locale,
                    )}
                  </Text>
                </Group>
              ))}
            </Stack>
          </DashboardSection>
        </Grid.Col>
      </Grid>

      <Card className="insight-banner" padding="lg" radius="lg" withBorder>
        <Group justify="space-between" align="center" wrap="nowrap">
          <Group gap="md" wrap="nowrap">
            <ThemeIcon color="signal" variant="light" size={42} radius="md">
              <IconSparkles size={21} />
            </ThemeIcon>
            <Stack gap={3}>
              <Text fw={700}>{t("dashboard.insight.title")}</Text>
              <Text size="sm" c="dimmed">
                {t("dashboard.insight.description")}
              </Text>
            </Stack>
          </Group>
          <Badge visibleFrom="sm" color="signal" variant="light">
            {t("dashboard.insight.badge")}
          </Badge>
        </Group>
      </Card>
    </Stack>
  );
}
