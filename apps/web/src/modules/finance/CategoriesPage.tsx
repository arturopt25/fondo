import {
  Badge,
  Button,
  Card,
  Group,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconTag } from "@tabler/icons-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { z } from "zod";

import {
  createCategorySchema,
  type Category,
  type CreateCategoryInput,
} from "@fondo/shared-types";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@fondo/ui";

import {
  useArchiveCategoryMutation,
  useCategoriesQuery,
  useCreateCategoryMutation,
} from "./finance-hooks";

type Filter = "all" | "INCOME" | "EXPENSE";
type CategoryFormInput = z.input<typeof createCategorySchema>;

export function CategoriesPage(): React.JSX.Element {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<Filter>("all");
  const categoriesQuery = useCategoriesQuery(
    filter === "all" ? undefined : filter,
  );
  const createCategory = useCreateCategoryMutation();
  const archiveCategory = useArchiveCategoryMutation();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CategoryFormInput>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: { name: "", type: "EXPENSE" },
  });

  const categories = categoriesQuery.data?.items ?? [];
  const type = watch("type");

  function onCreate(values: CategoryFormInput): void {
    const input: CreateCategoryInput = {
      name: values.name,
      type: values.type,
    };
    createCategory.mutate(input, { onSuccess: () => reset() });
  }

  return (
    <Stack className="page-stack" gap="xl">
      <PageHeader
        eyebrow={t("finance.categories.eyebrow")}
        title={t("finance.categories.title")}
        description={t("finance.categories.description")}
      />

      {categoriesQuery.isLoading ? (
        <LoadingState label={t("common.loading")} />
      ) : categoriesQuery.isError ? (
        <ErrorState title={t("finance.errors.loadFailedTitle")} />
      ) : (
        <>
          <Card padding="xl" radius="lg" withBorder>
            <Title order={3} mb="lg">
              {t("finance.categories.newCategory")}
            </Title>
            <form onSubmit={handleSubmit(onCreate)} noValidate>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <TextInput
                  label={t("finance.categories.name")}
                  placeholder={t("finance.categories.namePlaceholder")}
                  {...register("name")}
                  error={errors.name?.message}
                />
                <Select
                  label={t("finance.categories.type")}
                  value={type}
                  onChange={(value) =>
                    setValue(
                      "type",
                      (value ?? "EXPENSE") as CreateCategoryInput["type"],
                    )
                  }
                  data={[
                    {
                      value: "EXPENSE",
                      label: t("finance.categoryTypes.EXPENSE"),
                    },
                    {
                      value: "INCOME",
                      label: t("finance.categoryTypes.INCOME"),
                    },
                  ]}
                />
              </SimpleGrid>
              <Group justify="flex-end" mt="lg">
                <Button
                  type="submit"
                  color="signal"
                  loading={createCategory.isPending}
                >
                  {t("finance.categories.create")}
                </Button>
              </Group>
            </form>
          </Card>

          <Group justify="space-between">
            <Title order={3}>{t("finance.categories.listTitle")}</Title>
            <Select
              value={filter}
              onChange={(value) => setFilter((value ?? "all") as Filter)}
              data={[
                { value: "all", label: t("finance.categories.filterAll") },
                { value: "INCOME", label: t("finance.categoryTypes.INCOME") },
                { value: "EXPENSE", label: t("finance.categoryTypes.EXPENSE") },
              ]}
            />
          </Group>

          {categories.length === 0 ? (
            <EmptyState
              title={t("finance.categories.emptyTitle")}
              description={t("finance.categories.emptyDescription")}
            />
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
              {categories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  onArchive={() => archiveCategory.mutate(category.id)}
                  archiving={archiveCategory.isPending}
                />
              ))}
            </SimpleGrid>
          )}
        </>
      )}
    </Stack>
  );
}

function CategoryCard({
  category,
  onArchive,
  archiving,
}: {
  readonly category: Category;
  readonly onArchive: () => void;
  readonly archiving: boolean;
}): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Card padding="lg" radius="lg" withBorder>
      <Group justify="space-between" align="flex-start">
        <Group gap="sm">
          <IconTag size={20} stroke={1.5} />
          <Stack gap={2}>
            <Text fw={600}>{category.name}</Text>
            <Text size="xs" c="dimmed">
              {t(`finance.categoryTypes.${category.type}`)}
              {category.isDefault ? ` · ${t("finance.categories.default")}` : ""}
            </Text>
          </Stack>
        </Group>
        <Badge color={category.isActive ? "teal" : "gray"} variant="light" size="sm">
          {category.isActive
            ? t("finance.categories.active")
            : t("finance.categories.archived")}
        </Badge>
      </Group>
      {category.isActive && !category.isDefault ? (
        <Button
          variant="subtle"
          color="red"
          size="xs"
          mt="md"
          loading={archiving}
          onClick={onArchive}
        >
          {t("finance.categories.archive")}
        </Button>
      ) : null}
    </Card>
  );
}