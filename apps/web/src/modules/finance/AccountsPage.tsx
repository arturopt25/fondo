import {
  Badge,
  Button,
  Card,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconWallet } from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { z } from "zod";

import {
  createAccountSchema,
  type CreateAccountInput,
  type FinancialAccount,
} from "@fondo/shared-types";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@fondo/ui";

import {
  useAccountsQuery,
  useArchiveAccountMutation,
  useCreateAccountMutation,
} from "./finance-hooks";

type AccountFormInput = z.input<typeof createAccountSchema>;

export function AccountsPage(): React.JSX.Element {
  const { t } = useTranslation();
  const accountsQuery = useAccountsQuery();
  const createAccount = useCreateAccountMutation();
  const archiveAccount = useArchiveAccountMutation();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AccountFormInput>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: {
      name: "",
      type: "CASH",
      currency: "USD",
      openingBalanceMinor: 0,
    },
  });

  const accounts = accountsQuery.data?.items ?? [];
  const type = watch("type");

  function onCreate(values: AccountFormInput): void {
    const input: CreateAccountInput = {
      name: values.name,
      type: values.type,
      currency: values.currency ?? "USD",
      openingBalanceMinor: values.openingBalanceMinor ?? 0,
    };
    createAccount.mutate(input, { onSuccess: () => reset() });
  }

  return (
    <Stack className="page-stack" gap="xl">
      <PageHeader
        eyebrow={t("finance.accounts.eyebrow")}
        title={t("finance.accounts.title")}
        description={t("finance.accounts.description")}
      />

      {accountsQuery.isLoading ? (
        <LoadingState label={t("common.loading")} />
      ) : accountsQuery.isError ? (
        <ErrorState title={t("finance.errors.loadFailedTitle")} />
      ) : (
        <>
          <Card padding="xl" radius="lg" withBorder>
            <Title order={3} mb="lg">
              {t("finance.accounts.newAccount")}
            </Title>
            <form onSubmit={handleSubmit(onCreate)} noValidate>
              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                <TextInput
                  label={t("finance.accounts.name")}
                  placeholder={t("finance.accounts.namePlaceholder")}
                  {...register("name")}
                  error={errors.name?.message}
                />
                <Select
                  label={t("finance.accounts.type")}
                  value={type}
                  onChange={(value) =>
                    setValue(
                      "type",
                      (value ?? "CASH") as CreateAccountInput["type"],
                    )
                  }
                  data={[
                    { value: "CASH", label: t("finance.accountTypes.CASH") },
                    { value: "BANK", label: t("finance.accountTypes.BANK") },
                    {
                      value: "CREDIT_CARD",
                      label: t("finance.accountTypes.CREDIT_CARD"),
                    },
                    { value: "OTHER", label: t("finance.accountTypes.OTHER") },
                  ]}
                />
                <NumberInput
                  label={t("finance.accounts.openingBalance")}
                  min={0}
                  onChange={(value) =>
                    setValue(
                      "openingBalanceMinor",
                      Math.round((typeof value === "number" ? value : 0) * 100),
                    )
                  }
                />
              </SimpleGrid>
              <Group justify="flex-end" mt="lg">
                <Button
                  type="submit"
                  color="signal"
                  loading={createAccount.isPending}
                >
                  {t("finance.accounts.create")}
                </Button>
              </Group>
            </form>
          </Card>

          {accounts.length === 0 ? (
            <EmptyState
              title={t("finance.accounts.emptyTitle")}
              description={t("finance.accounts.emptyDescription")}
            />
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
              {accounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onArchive={() => archiveAccount.mutate(account.id)}
                  archiving={archiveAccount.isPending}
                />
              ))}
            </SimpleGrid>
          )}
        </>
      )}
    </Stack>
  );
}

function AccountCard({
  account,
  onArchive,
  archiving,
}: {
  readonly account: FinancialAccount;
  readonly onArchive: () => void;
  readonly archiving: boolean;
}): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Card padding="lg" radius="lg" withBorder>
      <Group justify="space-between" align="flex-start">
        <Group gap="sm">
          <IconWallet size={20} stroke={1.5} />
          <Stack gap={2}>
            <Text fw={600}>{account.name}</Text>
            <Text size="xs" c="dimmed">
              {t(`finance.accountTypes.${account.type}`)}
            </Text>
          </Stack>
        </Group>
        <Badge color={account.isActive ? "teal" : "gray"} variant="light" size="sm">
          {account.isActive
            ? t("finance.accounts.active")
            : t("finance.accounts.archived")}
        </Badge>
      </Group>
      <Text ff="monospace" size="lg" fw={700} mt="md">
        {(account.openingBalanceMinor / 100).toLocaleString(undefined, {
          style: "currency",
          currency: account.currency,
        })}
      </Text>
      {account.isActive ? (
        <Button
          variant="subtle"
          color="red"
          size="xs"
          mt="md"
          loading={archiving}
          onClick={onArchive}
        >
          {t("finance.accounts.archive")}
        </Button>
      ) : null}
    </Card>
  );
}