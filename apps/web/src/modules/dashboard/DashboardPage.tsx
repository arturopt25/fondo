import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  SimpleGrid,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { AreaChart, DonutChart } from "@mantine/charts";
import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconBuildingBank,
  IconCalendarStats,
  IconChevronDown,
  IconChevronRight,
  IconChevronUp,
  IconCircleCheck,
  IconPlus,
  IconReceipt,
  IconSparkles,
  IconWallet,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";

import {
  DashboardSection,
  EmptyState,
  ErrorState,
  LoadingState,
  MetricCard,
  PageHeader,
} from "@fondo/ui";
import type {
  DashboardReport,
  ExchangeRateView,
  ServiceWithCapabilities,
  Transaction,
} from "@fondo/shared-types";

import {
  DateRangeSelector,
  type DateRange,
  type PeriodKey,
} from "../../components/DateRangeSelector";
import { useAppPreferences } from "../../app/preferences";
import { formatDate, formatMinorAmount } from "../../lib/money";
import {
  resolvePeriodRange,
  useDashboardReportQuery,
} from "../finance/reports-hooks";
import {
  activeCapabilities,
  cardKeyOf,
  serviceMeta,
} from "../services/service-presentation";
import { useServicesQuery } from "../services/services-hooks";

const SPEND_COLORS = ["#2ad6d7", "#a78bfa", "#f6a66a", "#f4778a", "#65777b"];

export function DashboardPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { displayCurrency } = useAppPreferences();
  const [period, setPeriod] = useState<PeriodKey>("currentMonth");
  const [customRange, setCustomRange] = useState<DateRange>([null, null]);
  const locale = i18n.language === "en" ? "en-US" : "es-ES";

  const reportQuery = useDashboardReportQuery(
    resolvePeriodRange(period, customRange),
  );
  const servicesQuery = useServicesQuery();
  const services = servicesQuery.data?.services ?? [];

  function goToTransactions(): void {
    navigate("/app/transactions");
  }

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
              onClick={goToTransactions}
            >
              {t("dashboard.newTransaction")}
            </Button>
          </Group>
        }
      />

      {reportQuery.isLoading ? (
        <LoadingState label={t("common.loading")} />
      ) : reportQuery.isError ? (
        <ErrorState title={t("finance.errors.loadFailedTitle")} />
      ) : reportQuery.data ? (
        <>
          <BalanceSheet
            report={reportQuery.data}
            services={services}
            displayCurrency={displayCurrency}
            locale={locale}
          />
          {isEmpty(reportQuery.data) ? (
            <EmptyState
              title={t("dashboard.emptyTitle")}
              description={t("dashboard.emptyDescription")}
            />
          ) : (
            <DashboardContent
              report={reportQuery.data}
              displayCurrency={displayCurrency}
              locale={locale}
            />
          )}
        </>
      ) : null}
    </Stack>
  );
}

function isEmpty(report: {
  readonly balanceMinor: number;
  readonly cashFlow: readonly { incomeMinor: number; expenseMinor: number }[];
  readonly recent: readonly unknown[];
}): boolean {
  return (
    report.balanceMinor === 0 &&
    report.cashFlow.every(
      (point) => point.incomeMinor === 0 && point.expenseMinor === 0,
    ) &&
    report.recent.length === 0
  );
}

function DashboardContent({
  report,
  displayCurrency,
  locale,
}: {
  readonly report: DashboardReport;
  readonly displayCurrency: "USD" | "EUR";
  readonly locale: string;
}): React.JSX.Element {
  const { t } = useTranslation();
  const rate = report.exchangeRate;
  const summary = report.summary;

  const chartData = report.cashFlow.map((point) => ({
    bucket: point.bucket,
    income: convert(point.incomeMinor, rate) / 100,
    expenses: convert(point.expenseMinor, rate) / 100,
  }));
  const donutData = report.categorySpend.map((category, index) => ({
    name: categoryLabel(category.categoryName, t),
    value: convert(category.amountMinor, rate) / 100,
    color: SPEND_COLORS[index % SPEND_COLORS.length] ?? "#2ad6d7",
  }));

  return (
    <>
      <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="md">
        <MetricCard
          label={t("dashboard.metrics.income")}
          value={formatMinorAmount(
            summary.incomeMinor,
            displayCurrency,
            rate,
            locale,
          )}
          detail={t("dashboard.metrics.vsLastPeriod")}
          icon={IconArrowUpRight}
          tone="green"
        />
        <MetricCard
          label={t("dashboard.metrics.expenses")}
          value={formatMinorAmount(
            summary.expenseMinor,
            displayCurrency,
            rate,
            locale,
          )}
          detail={t("dashboard.metrics.vsLastPeriod")}
          icon={IconArrowDownRight}
          tone="coral"
        />
        <MetricCard
          label={t("dashboard.metrics.savings")}
          value={formatMinorAmount(
            summary.savingsMinor,
            displayCurrency,
            rate,
            locale,
          )}
          detail={t("dashboard.metrics.netFlow")}
          icon={IconSparkles}
          tone="violet"
        />
        <MetricCard
          label={t("dashboard.metrics.savingsRate")}
          value={`${summary.savingsRate}%`}
          detail={t("dashboard.metrics.ofIncome")}
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
            {chartData.length > 0 ? (
              <AreaChart
                h={270}
                data={chartData}
                dataKey="bucket"
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
            ) : (
              <EmptyState
                title={t("dashboard.cashFlow.emptyTitle")}
                description={t("dashboard.cashFlow.emptyDescription")}
              />
            )}
          </DashboardSection>
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <DashboardSection
            title={t("dashboard.spending.title")}
            eyebrow={t("dashboard.spending.eyebrow")}
            className="spending-section"
          >
            {donutData.length > 0 ? (
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
                  {report.categorySpend.slice(0, 4).map((category, index) => (
                    <Group
                      key={category.categoryId}
                      justify="space-between"
                      gap="sm"
                    >
                      <Group gap="xs">
                        <span
                          className="legend-dot"
                          style={{
                            backgroundColor:
                              SPEND_COLORS[index % SPEND_COLORS.length],
                          }}
                        />
                        <Text size="sm">
                          {categoryLabel(category.categoryName, t)}
                        </Text>
                      </Group>
                      <Text ff="monospace" size="sm">
                        {formatMinorAmount(
                          category.amountMinor,
                          displayCurrency,
                          rate,
                          locale,
                        )}
                      </Text>
                    </Group>
                  ))}
                </Stack>
              </Stack>
            ) : (
              <EmptyState
                title={t("dashboard.spending.emptyTitle")}
                description={t("dashboard.spending.emptyDescription")}
              />
            )}
          </DashboardSection>
        </Grid.Col>
      </Grid>

      <Grid gutter="md" align="stretch">
        <Grid.Col span={{ base: 12, lg: 7 }}>
          <DashboardSection
            title={t("dashboard.budgets.title")}
            eyebrow={t("dashboard.budgets.eyebrow")}
          >
            <EmptyState
              title={t("dashboard.budgets.emptyTitle")}
              description={t("dashboard.budgets.emptyDescription")}
            />
          </DashboardSection>
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 5 }}>
          <DashboardSection
            title={t("dashboard.recent.title")}
            eyebrow={t("dashboard.recent.eyebrow")}
          >
            <RecentTransactions
              transactions={report.recent}
              displayCurrency={displayCurrency}
              rate={rate}
              locale={locale}
            />
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
    </>
  );
}

function BalanceSheet({
  report,
  services,
  displayCurrency,
  locale,
}: {
  readonly report: DashboardReport;
  readonly services: readonly ServiceWithCapabilities[];
  readonly displayCurrency: "USD" | "EUR";
  readonly locale: string;
}): React.JSX.Element {
  const { t } = useTranslation();
  const rate = report.exchangeRate;
  const active = services.filter((service) => service.status === "ACTIVE");
  const personalFinance = active.find(
    (service) => service.key === "PERSONAL_FINANCE",
  );
  const others = active.filter(
    (service) => service.key !== "PERSONAL_FINANCE",
  );

  return (
    <>
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
                      report.balanceMinor,
                      displayCurrency,
                      rate,
                      locale,
                    )}
                  </Text>
                  <Group gap="xs">
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
              {rate ? (
                <div className="balance-hero__stat">
                  <Text className="eyebrow" size="xs">
                    {t("dashboard.exchangeRate")}
                  </Text>
                  <Text className="hero-rate">
                    1 {rate.from} = {rate.rate.toFixed(2)} {rate.to}
                  </Text>
                  <Text c="dimmed" size="xs">
                    {rate.source} · {formatDate(rate.effectiveAt, locale)}
                  </Text>
                </div>
              ) : null}
            </div>
          </Grid.Col>
        </Grid>
        {personalFinance ? (
          <PersonalFinanceSheet
            report={report}
            service={personalFinance}
            displayCurrency={displayCurrency}
            rate={rate}
            locale={locale}
          />
        ) : null}
      </Card>

      {others.length > 0 ? (
        <Stack gap="sm">
          <Group justify="space-between" align="flex-end">
            <Stack gap={4}>
              <Text className="eyebrow" size="xs">
                {t("dashboard.services.eyebrow")}
              </Text>
              <Title order={3} className="section-title">
                {t("dashboard.services.title")}
              </Title>
            </Stack>
            <Button
              component={RouterLink}
              to="/app/services"
              variant="subtle"
              color="gray"
              size="xs"
              rightSection={<IconChevronRight size={14} />}
            >
              {t("dashboard.services.manage")}
            </Button>
          </Group>
          <Stack gap="md">
            {others.map((service) => (
              <ServiceSheetCard
                key={service.key}
                service={service}
                report={report}
                displayCurrency={displayCurrency}
                rate={rate}
                locale={locale}
              />
            ))}
          </Stack>
        </Stack>
      ) : null}
    </>
  );
}

function PersonalFinanceSheet({
  report,
  service,
  displayCurrency,
  rate,
  locale,
}: {
  readonly report: DashboardReport;
  readonly service: ServiceWithCapabilities;
  readonly displayCurrency: "USD" | "EUR";
  readonly rate: ExchangeRateView | null;
  readonly locale: string;
}): React.JSX.Element {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const total = activeCapabilities(service).length;
  const collapsedLimit = 3;

  return (
    <Stack
      className="balance-hero__sheet"
      gap="xs"
      px={{ base: "lg", sm: "xl" }}
      pb={{ base: "lg", sm: "xl" }}
    >
      <Divider mb="sm" />
      <ServiceSheetHeader service={service} />
      <SheetTable
        service={service}
        balancesByKey={serviceBalanceMap(report, service.key)}
        totalMinor={report.balanceMinor}
        totalLabel={t("dashboard.services.total", {
          name: serviceName(service, t),
        })}
        displayCurrency={displayCurrency}
        rate={rate}
        locale={locale}
        limit={expanded ? undefined : collapsedLimit}
      />
      {total > collapsedLimit ? (
        <Button
          variant="subtle"
          color="signal"
          size="xs"
          fullWidth
          mt={6}
          onClick={() => setExpanded((value) => !value)}
          rightSection={
            expanded ? (
              <IconChevronUp size={14} />
            ) : (
              <IconChevronDown size={14} />
            )
          }
        >
          {expanded
            ? t("dashboard.services.showLess")
            : t("dashboard.services.showMore")}
        </Button>
      ) : null}
    </Stack>
  );
}

function ServiceSheetCard({
  service,
  report,
  displayCurrency,
  rate,
  locale,
}: {
  readonly service: ServiceWithCapabilities;
  readonly report: DashboardReport;
  readonly displayCurrency: "USD" | "EUR";
  readonly rate: ExchangeRateView | null;
  readonly locale: string;
}): React.JSX.Element {
  const { t } = useTranslation();
  const balance = report.serviceBalances.find(
    (item) => item.serviceKey === service.key,
  );

  return (
    <Card className="service-sheet" padding="lg" radius="lg" withBorder>
      <ServiceSheetHeader service={service} />
      <SheetTable
        service={service}
        balancesByKey={serviceBalanceMap(report, service.key)}
        totalMinor={balance?.balanceMinor ?? 0}
        totalLabel={t("dashboard.services.total", {
          name: serviceName(service, t),
        })}
        displayCurrency={displayCurrency}
        rate={rate}
        locale={locale}
      />
    </Card>
  );
}

function ServiceSheetHeader({
  service,
}: {
  readonly service: ServiceWithCapabilities;
}): React.JSX.Element {
  const { t } = useTranslation();
  const meta = serviceMeta[service.key] ?? {
    icon: IconBuildingBank,
    statusColor: "gray",
  };

  return (
    <Group justify="space-between" align="center" mb="sm">
      <Group gap="sm">
        <ThemeIcon color="signal" variant="light" size={30} radius="md">
          <meta.icon size={16} stroke={1.6} />
        </ThemeIcon>
        <Text fw={700}>{serviceName(service, t)}</Text>
      </Group>
      <Badge color="teal" variant="light" size="sm">
        {t("services.status.active")}
      </Badge>
    </Group>
  );
}

function SheetTable({
  service,
  balancesByKey,
  totalMinor,
  totalLabel,
  displayCurrency,
  rate,
  locale,
  limit,
}: {
  readonly service: ServiceWithCapabilities;
  readonly balancesByKey: ReadonlyMap<string, number>;
  readonly totalMinor: number;
  readonly totalLabel: string;
  readonly displayCurrency: "USD" | "EUR";
  readonly rate: ExchangeRateView | null;
  readonly locale: string;
  readonly limit?: number | undefined;
}): React.JSX.Element {
  const { t } = useTranslation();
  const cardKey = cardKeyOf(service.key);
  const capabilities = activeCapabilities(service);
  const visible = limit ? capabilities.slice(0, limit) : capabilities;

  return (
    <Table className="service-sheet__table" variant="unstyled">
      <Table.Tbody>
        {visible.map((capability) => (
          <Table.Tr key={capability.key}>
            <Table.Td>{t(
              `services.capabilities.${cardKey}.${capability.key}.name`,
              { defaultValue: capability.name },
            )}</Table.Td>
            <Table.Td ta="right" ff="monospace">
              {formatMinorAmount(
                balancesByKey.get(capability.key) ?? 0,
                displayCurrency,
                rate,
                locale,
              )}
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
      <Table.Tfoot>
        <Table.Tr>
          <Table.Td fw={700}>{totalLabel}</Table.Td>
          <Table.Td ta="right" fw={700} ff="monospace">
            {formatMinorAmount(
              totalMinor,
              displayCurrency,
              rate,
              locale,
            )}
          </Table.Td>
        </Table.Tr>
      </Table.Tfoot>
    </Table>
  );
}

function serviceBalanceMap(
  report: DashboardReport,
  serviceKey: string,
): Map<string, number> {
  const balance = report.serviceBalances.find(
    (item) => item.serviceKey === serviceKey,
  );
  return new Map(
    (balance?.capabilities ?? []).map((capability) => [
      capability.key,
      capability.balanceMinor,
    ]),
  );
}

function serviceName(
  service: ServiceWithCapabilities,
  t: ReturnType<typeof useTranslation>["t"],
): string {
  return t(`services.cards.${cardKeyOf(service.key)}.name`, {
    defaultValue: service.name,
  });
}

function RecentTransactions({
  transactions,
  displayCurrency,
  rate,
  locale,
}: {
  readonly transactions: readonly Transaction[];
  readonly displayCurrency: "USD" | "EUR";
  readonly rate: ExchangeRateView | null;
  readonly locale: string;
}): React.JSX.Element {
  const { t } = useTranslation();

  if (transactions.length === 0) {
    return (
      <EmptyState
        title={t("dashboard.recent.emptyTitle")}
        description={t("dashboard.recent.emptyDescription")}
      />
    );
  }

  return (
    <Stack gap="xs">
      {transactions.map((transaction) => {
        const isIncome = transaction.type === "INCOME";
        const isTransfer = transaction.type === "TRANSFER";
        return (
          <Group
            key={transaction.id}
            className="transaction-row"
            justify="space-between"
            wrap="nowrap"
          >
            <Group gap="sm" wrap="nowrap" miw={0}>
              <Avatar
                color={isIncome ? "teal" : "signal"}
                radius="md"
                size={34}
              >
                {isIncome ? (
                  <IconCircleCheck size={17} />
                ) : (
                  <IconReceipt size={17} />
                )}
              </Avatar>
              <Stack gap={2} miw={0}>
                <Text size="sm" fw={600} truncate>
                  {transaction.note ??
                    t(`transactions.types.${transaction.type}`)}
                </Text>
                <Text size="xs" c="dimmed">
                  {formatDate(transaction.occurredAt, locale)}
                </Text>
              </Stack>
            </Group>
            <Text
              className={isIncome ? "amount-positive" : "amount-negative"}
              ff="monospace"
              size="sm"
              fw={600}
            >
              {isTransfer ? "↔ " : isIncome ? "+" : "-"}
              {formatMinorAmount(
                transaction.amountMinor,
                displayCurrency,
                rate,
                locale,
              )}
            </Text>
          </Group>
        );
      })}
    </Stack>
  );
}

function convert(amountMinor: number, rate: { rate: number } | null): number {
  return rate ? Math.round(amountMinor * rate.rate) : amountMinor;
}

function categoryLabel(
  name: string,
  t: ReturnType<typeof useTranslation>["t"],
): string {
  return t(`finance.categories.${name.toLowerCase()}`, {
    defaultValue: name,
  });
}
