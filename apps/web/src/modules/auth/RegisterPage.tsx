import {
  Alert,
  Button,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconAlertCircle } from "@tabler/icons-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";

import { AuthLayout } from "./AuthLayout";
import { createRegisterSchema, type RegisterInput } from "./auth-schemas";
import { signUpWithEmail } from "./auth-client";
import { useAuth } from "./auth-context";

export function RegisterPage(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const registerSchema = createRegisterSchema({
    emailInvalid: t("auth.validation.emailInvalid"),
    emailRequired: t("auth.validation.emailRequired"),
    nameRequired: t("auth.validation.nameRequired"),
    passwordRequired: t("auth.validation.passwordRequired"),
    passwordMin: t("auth.validation.passwordMin"),
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(values: RegisterInput): Promise<void> {
    setSubmitError(null);
    try {
      await signUpWithEmail(values.name, values.email, values.password);
      await refresh();
      navigate("/app/dashboard", { replace: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("auth.registrationFailed");
      setSubmitError(message);
    }
  }

  return (
    <AuthLayout
      eyebrow={t("auth.signUpTitle")}
      title={t("auth.signUpTitle")}
      description={t("auth.signUpSubtitle")}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack gap="md">
          <TextInput
            label={t("auth.name")}
            placeholder={t("auth.namePlaceholder")}
            required
            autoComplete="name"
            {...register("name")}
            error={errors.name?.message}
          />
          <TextInput
            label={t("auth.email")}
            type="email"
            placeholder={t("auth.emailPlaceholder")}
            required
            autoComplete="email"
            {...register("email")}
            error={errors.email?.message}
          />
          <PasswordInput
            label={t("auth.password")}
            placeholder={t("auth.passwordPlaceholder")}
            required
            autoComplete="new-password"
            {...register("password")}
            error={errors.password?.message}
          />
          {submitError ? (
            <Alert
              color="red"
              icon={<IconAlertCircle size={16} />}
              px="sm"
              py="xs"
            >
              {submitError}
            </Alert>
          ) : null}
          <Button type="submit" color="signal" fullWidth loading={isSubmitting}>
            {t("auth.signUp")}
          </Button>
          <Text size="sm" c="dimmed" ta="center">
            {t("auth.haveAccount")}{" "}
            <Text
              component={RouterLink}
              to="/login"
              c="signal"
              fw={600}
              size="sm"
            >
              {t("auth.goToLogin")}
            </Text>
          </Text>
        </Stack>
      </form>
    </AuthLayout>
  );
}