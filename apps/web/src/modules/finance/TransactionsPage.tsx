import {
  Button,
  Card,
  Group,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useState } from "react";

import {
  createExpenseSchema,
  createIncomeSchema,
  type ServiceKey,
  type Transaction,
} from "@fondo/shared-types";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@fondo/ui";

import { useAccountsQuery, useCategoriesQuery } from "./finance-hooks";
import {
  useCreateExpenseMutation,
  useCreateIncomeMutation,
  useLedgerBalanceQuery,
  useTransactionsQuery,
} from "./transactions-hooks";
import { useServicesQuery } from "../services/services-hooks";

type FormValues = {
  amount: number;
  note: string;
  accountId: string;
  categoryId: string;
  serviceKey: ServiceKey | null;
};

export function TransactionsPage(): React.JSX.Element {
  const { t } = useTranslation();
  const [type, setType] = useState<"income" | "expense">("expense");

  const accountsQuery = useAccountsQuery();
  const categoriesQuery = useCategoriesQuery(
    type === "income" ? "INCOME" : "EXPENSE",
  );
  const transactionsQuery = useTransactionsQuery();
  const balanceQuery = useLedgerBalanceQuery();
  const servicesQuery = useServicesQuery();
  const createIncome = useCreateIncomeMutation();
  const createExpense = useCreateExpenseMutation();

  const schema = type === "income" ? createIncomeSchema : createExpenseSchema;
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues: {
      amount: 0,
      note: "",
      accountId: "",
      categoryId: "",
      serviceKey: null,
    },
  });

  const accounts = accountsQuery.data?.items ?? [];
  const categories = categoriesQuery.data?.items ?? [];
  const transactions = transactionsQuery.data?.items ?? [];
  const activeServices =
    servicesQuery.data?.services.filter(
      (service) => service.status === "ACTIVE",
    ) ?? [];

  const submitting = createIncome.isPending || createExpense.isPending;

  async function onSubmit(values: FormValues): Promise<void> {
    const base = {
      accountId: values.accountId,
      categoryId: values.categoryId,
      amountMinor: Math.round((values.amount ?? 0) * 100),
      note: values.note || undefined,
      ...(values.serviceKey ? { serviceKey: values.serviceKey } : {}),
    };
    if (type === "income") {
      createIncome.mutate(base, { onSuccess: () => reset() });
    } else {
      createExpense.mutate(base, { onSuccess: () => reset() });
    }
  }

  return (
    <Stack className="page-stack" gap="xl">
      <PageHeader
        eyebrow={t("transactions.eyebrow")}
        title={t("transactions.title")}
        description={t("transactions.description")}
      />

      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
        <Card padding="xl" radius="lg" withBorder>
          <Title order={3} mb="lg">
            {t("transactions.newMovement")}
          </Title>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Stack gap="md">
              <SegmentedControl
                fullWidth
                value={type}
                onChange={(value) => {
                  const next = value === "income" ? "income" : "expense";
                  setType(next);
                  setValue("categoryId", "");
                }}
                data={[
                  { value: "expense", label: t("transactions.types.EXPENSE") },
                  { value: "income", label: t("transactions.types.INCOME") },
                ]}
              />
              <Select
                label={t("transactions.account")}
                placeholder={t("transactions.accountPlaceholder")}
                required
                data={accounts.map((account) => ({
                  value: account.id,
                  label: account.name,
                }))}
                onChange={(value) => setValue("accountId", value ?? "")}
                error={errors.accountId?.message}
              />
              <Select
                label={t("transactions.category")}
                placeholder={t("transactions.categoryPlaceholder")}
                required
                data={categories.map((category) => ({
                  value: category.id,
                  label: category.name,
                }))}
                onChange={(value) => setValue("categoryId", value ?? "")}
                error={errors.categoryId?.message}
              />
              <NumberInput
                label={t("transactions.amount")}
                min={0}
                required
                onChange={(value) =>
                  setValue("amount", typeof value === "number" ? value : 0)
                }
              />
              <Select
                label={t("transactions.service")}
                placeholder={t("transactions.servicePlaceholder")}
                clearable
                data={activeServices.map((service) => ({
                  value: service.key,
                  label: service.name,
                }))}
                onChange={(value) =>
                  setValue("serviceKey", (value ?? null) as ServiceKey | null)
                }
              />
              <TextInput
                label={t("transactions.note")}
                placeholder={t("transactions.notePlaceholder")}
                {...register("note")}
              />
              <Button
                type="submit"
                color="signal"
                fullWidth
                loading={submitting}
              >
                {type === "income"
                  ? t("transactions.createIncome")
                  : t("transactions.createExpense")}
              </Button>
            </Stack>
          </form>
        </Card>

        <Card padding="xl" radius="lg" withBorder>
          <Title order={3} mb="lg">
            {t("transactions.balance")}
          </Title>
          {balanceQuery.isLoading ? (
            <LoadingState label={t("common.loading")} />
          ) : balanceQuery.isError ? (
            <ErrorState title={t("finance.errors.loadFailedTitle")} />
          ) : (
            <Stack gap="sm">
              <Text className="hero-balance" component="p">
                {formatMinor(balanceQuery.data?.totalMinor ?? 0)}
              </Text>
              {balanceQuery.data?.accounts.map((account) => (
                <Group key={account.id} justify="space-between">
                  <Text size="sm">{account.name}</Text>
                  <Text size="sm" c="dimmed">
                    {formatMinor(account.balanceMinor)}
                  </Text>
                </Group>
              ))}
            </Stack>
          )}
        </Card>
      </SimpleGrid>

      <Card padding="xl" radius="lg" withBorder>
        <Title order={3} mb="lg">
          {t("transactions.recent")}
        </Title>
        {transactionsQuery.isLoading ? (
          <LoadingState label={t("common.loading")} />
        ) : transactionsQuery.isError ? (
          <ErrorState title={t("finance.errors.loadFailedTitle")} />
        ) : transactions.length === 0 ? (
          <EmptyState
            title={t("transactions.emptyTitle")}
            description={t("transactions.emptyDescription")}
          />
        ) : (
          <TransactionTable transactions={transactions} />
        )}
      </Card>
    </Stack>
  );
}

function TransactionTable({
  transactions,
}: {
  readonly transactions: readonly Transaction[];
}): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Table>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>{t("transactions.table.type")}</Table.Th>
          <Table.Th>{t("transactions.table.service")}</Table.Th>
          <Table.Th>{t("transactions.table.note")}</Table.Th>
          <Table.Th>{t("transactions.table.date")}</Table.Th>
          <Table.Th ta="right">{t("transactions.table.amount")}</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {transactions.map((transaction) => {
          const isIncome = transaction.type === "INCOME";
          const sign = isIncome
            ? "+"
            : transaction.type === "EXPENSE"
              ? "-"
              : "↔";
          return (
            <Table.Tr key={transaction.id}>
              <Table.Td>{t(`transactions.types.${transaction.type}`)}</Table.Td>
              <Table.Td>{transaction.serviceKey ?? "—"}</Table.Td>
              <Table.Td>{transaction.note ?? "—"}</Table.Td>
              <Table.Td>
                {new Date(transaction.occurredAt).toLocaleDateString()}
              </Table.Td>
              <Table.Td ta="right" c={isIncome ? "teal" : "red"}>
                {sign} {formatMinor(transaction.amountMinor)}
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}

function formatMinor(amountMinor: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}
