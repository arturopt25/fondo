import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  Pagination,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconArrowBackUp } from "@tabler/icons-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useState } from "react";

import {
  serviceKeySchema,
  type ServiceKey,
  type Transaction,
} from "@fondo/shared-types";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@fondo/ui";

import { useAppPreferences } from "../../app/preferences";
import { formatMinorAmount } from "../../lib/money";
import { useAccountsQuery, useCategoriesQuery } from "./finance-hooks";
import {
  useCreateExpenseMutation,
  useCreateIncomeMutation,
  useCreateTransferMutation,
  useLedgerBalanceQuery,
  useReverseTransactionMutation,
  useTransactionsQuery,
} from "./transactions-hooks";
import { useServicesQuery } from "../services/services-hooks";
import {
  activeCapabilities,
  cardKeyOf,
} from "../services/service-presentation";

import { z } from "zod";

const PAGE_SIZE = 20;

type MovementType = "income" | "expense" | "transfer";

const amountFormSchema = z
  .number()
  .min(0.01, "Amount must be greater than zero");

const movementFormSchema = z.object({
  accountId: z.string().min(1, "Select an account"),
  categoryId: z.string().min(1, "Select a category"),
  amount: amountFormSchema,
  note: z.string().trim().max(500).optional(),
  serviceKey: serviceKeySchema.nullish(),
  capabilityKey: z.string().trim().max(64).nullish(),
});

const transferFormSchema = z.object({
  fromAccountId: z.string().min(1, "Select the source account"),
  toAccountId: z.string().min(1, "Select the destination account"),
  amount: amountFormSchema,
  note: z.string().trim().max(500).optional(),
});

type FormValues = {
  amount: number | null;
  note: string;
  accountId: string;
  categoryId: string;
  fromAccountId: string;
  toAccountId: string;
  serviceKey: ServiceKey | null;
  capabilityKey: string | null;
};

const EMPTY_FORM_VALUES: FormValues = {
  amount: null,
  note: "",
  accountId: "",
  categoryId: "",
  fromAccountId: "",
  toAccountId: "",
  serviceKey: null,
  capabilityKey: null,
};

export function TransactionsPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { displayCurrency } = useAppPreferences();
  const [type, setType] = useState<MovementType>("expense");
  const [page, setPage] = useState(1);
  const [reversing, setReversing] = useState<Transaction | null>(null);
  const [reverseNote, setReverseNote] = useState("");
  const [reverseModalOpened, reverseModal] = useDisclosure(false);
  const locale = i18n.language === "en" ? "en-US" : "es-ES";

  const accountsQuery = useAccountsQuery();
  const categoriesQuery = useCategoriesQuery(
    type === "income" ? "INCOME" : "EXPENSE",
  );
  const transactionsQuery = useTransactionsQuery({
    page,
    pageSize: PAGE_SIZE,
  });
  const balanceQuery = useLedgerBalanceQuery();
  const servicesQuery = useServicesQuery();
  const createIncome = useCreateIncomeMutation();
  const createExpense = useCreateExpenseMutation();
  const createTransfer = useCreateTransferMutation();
  const reverseTransaction = useReverseTransactionMutation();

  const rate = balanceQuery.data?.exchangeRate ?? null;

  const schema =
    type === "transfer" ? transferFormSchema : movementFormSchema;
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues: EMPTY_FORM_VALUES,
  });

  const accountId = watch("accountId");
  const categoryId = watch("categoryId");
  const fromAccountId = watch("fromAccountId");
  const toAccountId = watch("toAccountId");
  const serviceKey = watch("serviceKey");
  const capabilityKey = watch("capabilityKey");
  const amount = watch("amount");

  const accounts = accountsQuery.data?.items ?? [];
  const categories = categoriesQuery.data?.items ?? [];
  const transactions = transactionsQuery.data?.items ?? [];
  const total = transactionsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeServices =
    servicesQuery.data?.services.filter(
      (service) => service.status === "ACTIVE",
    ) ?? [];
  const selectedService = activeServices.find(
    (service) => service.key === serviceKey,
  );
  const capabilities = selectedService
    ? activeCapabilities(selectedService)
    : [];

  const submitting =
    createIncome.isPending ||
    createExpense.isPending ||
    createTransfer.isPending;

  async function onSubmit(values: FormValues): Promise<void> {
    const idempotencyKey = crypto.randomUUID();
    if (type === "transfer") {
      createTransfer.mutate(
        {
          input: {
            fromAccountId: values.fromAccountId,
            toAccountId: values.toAccountId,
            amountMinor: Math.round((values.amount ?? 0) * 100),
            ...(values.note ? { note: values.note } : {}),
          },
          idempotencyKey,
        },
        { onSuccess: () => reset(EMPTY_FORM_VALUES) },
      );
      return;
    }
    const base = {
      accountId: values.accountId,
      categoryId: values.categoryId,
      amountMinor: Math.round((values.amount ?? 0) * 100),
      ...(values.note ? { note: values.note } : {}),
      ...(values.serviceKey ? { serviceKey: values.serviceKey } : {}),
      ...(values.capabilityKey
        ? { capabilityKey: values.capabilityKey }
        : {}),
    };
    if (type === "income") {
      createIncome.mutate(
        { input: base, idempotencyKey },
        { onSuccess: () => reset(EMPTY_FORM_VALUES) },
      );
    } else {
      createExpense.mutate(
        { input: base, idempotencyKey },
        { onSuccess: () => reset(EMPTY_FORM_VALUES) },
      );
    }
  }

  function confirmReverse(): void {
    if (!reversing) {
      return;
    }
    reverseTransaction.mutate(
      {
        id: reversing.id,
        ...(reverseNote.trim() ? { note: reverseNote.trim() } : {}),
      },
      {
        onSuccess: () => {
          reverseModal.close();
          setReversing(null);
          setReverseNote("");
        },
      },
    );
  }

  function openReverseModal(transaction: Transaction): void {
    setReversing(transaction);
    setReverseNote("");
    reverseModal.open();
  }

  function formatMinor(amountMinor: number): string {
    return formatMinorAmount(amountMinor, displayCurrency, rate, locale);
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
                  const next = isMovementType(value) ? value : "expense";
                  setType(next);
                  setValue("categoryId", "");
                }}
                data={[
                  { value: "expense", label: t("transactions.types.EXPENSE") },
                  { value: "income", label: t("transactions.types.INCOME") },
                  { value: "transfer", label: t("transactions.types.TRANSFER") },
                ]}
              />
              {type === "transfer" ? (
                <>
                  <Select
                    label={t("transactions.fromAccount")}
                    placeholder={t("transactions.fromAccountPlaceholder")}
                    required
                    value={fromAccountId || null}
                    data={accounts.map((account) => ({
                      value: account.id,
                      label: account.name,
                    }))}
                    onChange={(value) => setValue("fromAccountId", value ?? "")}
                    error={errors.fromAccountId?.message}
                  />
                  <Select
                    label={t("transactions.toAccount")}
                    placeholder={t("transactions.toAccountPlaceholder")}
                    required
                    value={toAccountId || null}
                    data={accounts.map((account) => ({
                      value: account.id,
                      label: account.name,
                    }))}
                    onChange={(value) => setValue("toAccountId", value ?? "")}
                    error={errors.toAccountId?.message}
                  />
                </>
              ) : (
                <>
                  <Select
                    label={t("transactions.account")}
                    placeholder={t("transactions.accountPlaceholder")}
                    required
                    value={accountId || null}
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
                    value={categoryId || null}
                    data={categories.map((category) => ({
                      value: category.id,
                      label: category.name,
                    }))}
                    onChange={(value) => setValue("categoryId", value ?? "")}
                    error={errors.categoryId?.message}
                  />
                  <Select
                    label={t("transactions.service")}
                    placeholder={t("transactions.servicePlaceholder")}
                    clearable
                    value={serviceKey}
                    data={activeServices.map((service) => ({
                      value: service.key,
                      label: service.name,
                    }))}
                    onChange={(value) => {
                      setValue(
                        "serviceKey",
                        (value ?? null) as ServiceKey | null,
                      );
                      setValue("capabilityKey", null);
                    }}
                  />
                  {selectedService ? (
                    <Select
                      label={t("transactions.capability")}
                      placeholder={t("transactions.capabilityPlaceholder")}
                      clearable
                      value={capabilityKey}
                      data={capabilities.map((capability) => ({
                        value: capability.key,
                        label: t(
                          `services.capabilities.${cardKeyOf(selectedService.key)}.${capability.key}.name`,
                          { defaultValue: capability.name },
                        ),
                      }))}
                      onChange={(value) =>
                        setValue("capabilityKey", (value ?? null) as string | null)
                      }
                    />
                  ) : null}
                </>
              )}
              <NumberInput
                label={t("transactions.amount")}
                placeholder={t("transactions.amountPlaceholder")}
                min={0}
                required
                value={amount ?? ""}
                error={errors.amount?.message}
                onChange={(value) =>
                  setValue("amount", typeof value === "number" ? value : null)
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
                  : type === "expense"
                    ? t("transactions.createExpense")
                    : t("transactions.createTransfer")}
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
          <Stack gap="md">
            <TransactionTable
              transactions={transactions}
              formatMinor={formatMinor}
              onReverse={openReverseModal}
            />
            {totalPages > 1 ? (
              <Group justify="center">
                <Pagination
                  value={page}
                  onChange={setPage}
                  total={totalPages}
                />
              </Group>
            ) : null}
          </Stack>
        )}
      </Card>

      <Modal
        opened={reverseModalOpened}
        onClose={reverseModal.close}
        title={t("transactions.reverseModal.title")}
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {t("transactions.reverseModal.description")}
          </Text>
          <TextInput
            label={t("transactions.reverseModal.note")}
            placeholder={t("transactions.reverseModal.notePlaceholder")}
            value={reverseNote}
            onChange={(event) => setReverseNote(event.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={reverseModal.close}>
              {t("transactions.reverseModal.cancel")}
            </Button>
            <Button
              color="signal"
              loading={reverseTransaction.isPending}
              onClick={confirmReverse}
            >
              {t("transactions.reverseModal.confirm")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

function TransactionTable({
  transactions,
  formatMinor,
  onReverse,
}: {
  readonly transactions: readonly Transaction[];
  readonly formatMinor: (amountMinor: number) => string;
  readonly onReverse: (transaction: Transaction) => void;
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
          <Table.Th ta="right">{t("transactions.table.actions")}</Table.Th>
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
          const isReversed = transaction.reversedById !== null;
          const isReversal = transaction.reversesId !== null;
          return (
            <Table.Tr key={transaction.id}>
              <Table.Td>
                <Group gap="xs">
                  <span>{t(`transactions.types.${transaction.type}`)}</span>
                  {isReversed ? (
                    <Badge size="xs" variant="light" color="gray">
                      {t("transactions.table.reversed")}
                    </Badge>
                  ) : null}
                  {isReversal ? (
                    <Badge size="xs" variant="light" color="gray">
                      {t("transactions.table.reversal")}
                    </Badge>
                  ) : null}
                </Group>
              </Table.Td>
              <Table.Td>{transaction.serviceKey ?? "—"}</Table.Td>
              <Table.Td>{transaction.note ?? "—"}</Table.Td>
              <Table.Td>
                {new Date(transaction.occurredAt).toLocaleDateString()}
              </Table.Td>
              <Table.Td ta="right" c={isIncome ? "teal" : "red"}>
                {sign} {formatMinor(transaction.amountMinor)}
              </Table.Td>
              <Table.Td ta="right">
                {isReversed || isReversal ? null : (
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    aria-label={t("transactions.reverse")}
                    title={t("transactions.reverse")}
                    onClick={() => onReverse(transaction)}
                  >
                    <IconArrowBackUp size={16} />
                  </ActionIcon>
                )}
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}

function isMovementType(value: string): value is MovementType {
  return value === "income" || value === "expense" || value === "transfer";
}
