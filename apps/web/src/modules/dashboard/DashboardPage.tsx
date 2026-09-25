import {
  Avatar,
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Modal,
  NumberInput,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
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
  BudgetProgress,
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
  resolveBudgetPeriodRange,
  useBudgetsQuery,
  useDeleteBudgetMutation,
  useUpsertBudgetMutation,
  type BudgetPeriodRange,
} from "../finance/budgets-hooks";
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
  const budgetRange = resolveBudgetPeriodRange(period, customRange);
  const servicesQuery = useServicesQuery();
  const services = servicesQuery.data?.services ?? [];

  function goToTransactions(): void {
    navigate("/app/transactions");
  }

  return (
    <Stack className="page-stack" gap="lg">
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
            <>
              <EmptyState
                title={t("dashboard.emptyTitle")}
                description={t("dashboard.emptyDescription")}
              />
              <BudgetSection
                range={budgetRange}
                displayCurrency={displayCurrency}
                locale={locale}
                rate={reportQuery.data.exchangeRate}
              />
            </>
          ) : (
            <DashboardContent
              report={reportQuery.data}
              displayCurrency={displayCurrency}
              locale={locale}
              budgetRange={budgetRange}
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
  budgetRange,
}: {
  readonly report: DashboardReport;
  readonly displayCurrency: "USD" | "EUR";
  readonly locale: string;
  readonly budgetRange: BudgetPeriodRange;
}): React.JSX.Element {
  const { t } = useTranslation();
  const rate = report.exchangeRate;

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
          <BudgetSection
            range={budgetRange}
            displayCurrency={displayCurrency}
            locale={locale}
            rate={rate}
          />
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
  const summary = report.summary;
  const active = services.filter((service) => service.status === "ACTIVE");

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
            <div className="balance-hero__summary">
              <div className="balance-orbit balance-orbit--one" />
              <div className="balance-orbit balance-orbit--two" />
              <div className="balance-hero__summary-content">
                <SimpleGrid cols={2} spacing="xs">
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
                    compact
                    variant="embedded"
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
                    compact
                    variant="embedded"
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
                    compact
                    variant="embedded"
                  />
                  <MetricCard
                    label={t("dashboard.metrics.savingsRate")}
                    value={`${summary.savingsRate}%`}
                    detail={t("dashboard.metrics.ofIncome")}
                    icon={IconCalendarStats}
                    tone="cyan"
                    compact
                    variant="embedded"
                  />
                </SimpleGrid>
                {rate ? (
                  <div className="balance-hero__rate">
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
            </div>
          </Grid.Col>
        </Grid>
      </Card>

      {active.length > 0 ? (
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
          <SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }} spacing="md">
            {active.map((service) => (
              <ServiceSummaryCard
                key={service.key}
                service={service}
                report={report}
                displayCurrency={displayCurrency}
                rate={rate}
                locale={locale}
              />
            ))}
          </SimpleGrid>
        </Stack>
      ) : null}
    </>
  );
}

function ServiceSummaryCard({
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
  const [expanded, setExpanded] = useState(false);
  const total = activeCapabilities(service).length;
  const collapsedLimit = 3;
  const balance = report.serviceBalances.find(
    (item) => item.serviceKey === service.key,
  );

  return (
    <Card className="service-sheet" padding="md" radius="lg" withBorder>
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
        limit={expanded ? undefined : collapsedLimit}
      />
      {total > collapsedLimit ? (
        <Button
          variant="subtle"
          color="signal"
          size="xs"
          fullWidth
          mt={4}
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
            <Table.Td>
              {t(`services.capabilities.${cardKey}.${capability.key}.name`, {
                defaultValue: capability.name,
              })}
            </Table.Td>
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
            {formatMinorAmount(totalMinor, displayCurrency, rate, locale)}
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

function BudgetSection({
  range,
  displayCurrency,
  locale,
  rate,
}: {
  readonly range: BudgetPeriodRange;
  readonly displayCurrency: "USD" | "EUR";
  readonly locale: string;
  readonly rate: ExchangeRateView | null;
}): React.JSX.Element {
  const { t } = useTranslation();
  const budgetsQuery = useBudgetsQuery(range);
  const upsertBudget = useUpsertBudgetMutation();
  const deleteBudget = useDeleteBudgetMutation();
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | string>(0);

  const items = budgetsQuery.data?.items ?? [];
  const isSingleMonth =
    budgetsQuery.data?.period.from === budgetsQuery.data?.period.to;

  function openEditor(item: BudgetProgress): void {
    setSelectedCategoryId(item.categoryId);
    setEditingBudgetId(item.budgetId);
    setAmount(item.budgetMinor === null ? 0 : item.budgetMinor / 100);
    open();
  }

  function closeEditor(): void {
    close();
    setSelectedCategoryId(null);
    setEditingBudgetId(null);
    setAmount(0);
  }

  function saveBudget(): void {
    const period = budgetsQuery.data?.period.from ?? range.from;
    if (
      !selectedCategoryId ||
      !period ||
      typeof amount !== "number" ||
      amount <= 0
    ) {
      return;
    }

    upsertBudget.mutate(
      {
        categoryId: selectedCategoryId,
        period,
        amountMinor: Math.round(amount * 100),
      },
      { onSuccess: closeEditor },
    );
  }

  function removeBudget(): void {
    if (!editingBudgetId) {
      return;
    }
    deleteBudget.mutate(editingBudgetId, { onSuccess: closeEditor });
  }

  const action = isSingleMonth ? (
    <Button
      size="xs"
      color="signal"
      onClick={() => openEditor(items[0] ?? emptyBudgetItem())}
    >
      {t("dashboard.budgets.configure")}
    </Button>
  ) : null;

  return (
    <>
      <DashboardSection
        title={t("dashboard.budgets.title")}
        eyebrow={t("dashboard.budgets.eyebrow")}
        action={action}
      >
        {budgetsQuery.isLoading ? (
          <LoadingState label={t("common.loading")} />
        ) : budgetsQuery.isError ? (
          <ErrorState title={t("finance.errors.loadFailedTitle")} />
        ) : items.length === 0 ? (
          <EmptyState
            title={t("dashboard.budgets.emptyTitle")}
            description={t("dashboard.budgets.emptyDescription")}
          />
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            {items.map((item) => (
              <BudgetProgressCard
                key={item.categoryId}
                item={item}
                displayCurrency={displayCurrency}
                locale={locale}
                rate={rate}
                editable={isSingleMonth}
                onEdit={() => openEditor(item)}
                t={t}
              />
            ))}
          </SimpleGrid>
        )}
        {!isSingleMonth && items.length > 0 ? (
          <Text c="dimmed" size="xs" mt="md">
            {t("dashboard.budgets.multiMonthHint")}
          </Text>
        ) : null}
      </DashboardSection>
      <Modal
        opened={opened}
        onClose={closeEditor}
        title={
          editingBudgetId
            ? t("dashboard.budgets.edit")
            : t("dashboard.budgets.configure")
        }
      >
        <Stack gap="md">
          <Select
            label={t("dashboard.budgets.category")}
            data={items.map((item) => ({
              value: item.categoryId,
              label: item.categoryName,
            }))}
            value={selectedCategoryId}
            onChange={setSelectedCategoryId}
            disabled={Boolean(editingBudgetId)}
          />
          <NumberInput
            label={t("dashboard.budgets.amount")}
            min={0.01}
            decimalScale={2}
            fixedDecimalScale
            value={amount}
            onChange={setAmount}
          />
          <Group justify="space-between">
            {editingBudgetId ? (
              <Button
                color="red"
                variant="subtle"
                onClick={removeBudget}
                loading={deleteBudget.isPending}
              >
                {t("dashboard.budgets.delete")}
              </Button>
            ) : (
              <span />
            )}
            <Group gap="sm">
              <Button variant="default" onClick={closeEditor}>
                {t("dashboard.budgets.cancel")}
              </Button>
              <Button
                color="signal"
                onClick={saveBudget}
                loading={upsertBudget.isPending}
              >
                {t("dashboard.budgets.save")}
              </Button>
            </Group>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

function BudgetProgressCard({
  item,
  displayCurrency,
  locale,
  rate,
  editable,
  onEdit,
  t,
}: {
  readonly item: BudgetProgress;
  readonly displayCurrency: "USD" | "EUR";
  readonly locale: string;
  readonly rate: ExchangeRateView | null;
  readonly editable: boolean;
  readonly onEdit: () => void;
  readonly t: ReturnType<typeof useTranslation>["t"];
}): React.JSX.Element {
  const utilization = item.utilizationPercent ?? 0;
  const progress = Math.min(100, Math.max(0, utilization));

  return (
    <Card padding="sm" radius="md" withBorder>
      <Group justify="space-between" align="flex-start" gap="sm">
        <Stack gap={2} miw={0}>
          <Text fw={700} truncate>
            {item.categoryName}
          </Text>
          <Text size="xs" c="dimmed">
            {item.budgetMinor === null
              ? t("dashboard.budgets.noBudget")
              : `${t("dashboard.budgets.spent")}: ${formatMinorAmount(
                  item.actualMinor,
                  displayCurrency,
                  rate,
                  locale,
                )} / ${formatMinorAmount(
                  item.budgetMinor,
                  displayCurrency,
                  rate,
                  locale,
                )}`}
          </Text>
        </Stack>
        {editable ? (
          <Button variant="subtle" color="gray" size="xs" onClick={onEdit}>
            {item.budgetId
              ? t("dashboard.budgets.edit")
              : t("dashboard.budgets.configure")}
          </Button>
        ) : null}
      </Group>
      {item.budgetMinor !== null ? (
        <>
          <Progress
            value={progress}
            color={budgetProgressColor(utilization)}
            size="sm"
            mt="sm"
          />
          <Group justify="space-between" mt={5}>
            <Text size="xs" c="dimmed">
              {t("dashboard.budgets.remaining")}:{" "}
              {formatMinorAmount(
                item.remainingMinor ?? 0,
                displayCurrency,
                rate,
                locale,
              )}
            </Text>
            <Text size="xs" fw={700}>
              {utilization}%
            </Text>
          </Group>
        </>
      ) : null}
    </Card>
  );
}

function budgetProgressColor(utilization: number): string {
  if (utilization >= 100) {
    return "red";
  }
  if (utilization >= 80) {
    return "orange";
  }
  return "signal";
}

function emptyBudgetItem(): BudgetProgress {
  return {
    categoryId: "",
    categoryName: "",
    budgetId: null,
    budgetMinor: null,
    actualMinor: 0,
    remainingMinor: null,
    utilizationPercent: null,
  };
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
