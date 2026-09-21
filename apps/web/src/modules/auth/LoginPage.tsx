import {
  Alert,
  Button,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";

import { AuthLayout } from "./AuthLayout";
import { createLoginSchema, type LoginInput } from "./auth-schemas";
import { signInWithEmail } from "./auth-client";
import { useAuth } from "./auth-context";

export function LoginPage(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const loginSchema = createLoginSchema({
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
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput): Promise<void> {
    setSubmitError(null);
    try {
      await signInWithEmail(values.email, values.password);
      await refresh();
      navigate("/app/dashboard", { replace: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("auth.invalidCredentials");
      setSubmitError(message);
    }
  }

  return (
    <AuthLayout
      eyebrow={t("auth.signInTitle")}
      title={t("auth.signInTitle")}
      description={t("auth.signInSubtitle")}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack gap="md">
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
            autoComplete="current-password"
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
            {t("auth.signIn")}
          </Button>
          <Text size="sm" c="dimmed" ta="center">
            {t("auth.noAccount")}{" "}
            <Text
              component={RouterLink}
              to="/register"
              c="signal"
              fw={600}
              size="sm"
            >
              {t("auth.goToRegister")}
            </Text>
          </Text>
        </Stack>
      </form>
    </AuthLayout>
  );
}