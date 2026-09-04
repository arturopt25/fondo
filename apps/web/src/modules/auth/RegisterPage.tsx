import {
  Alert,
  Button,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";

import { AuthLayout } from "./AuthLayout";
import { signUpWithEmail } from "./auth-client";
import { useAuth } from "./auth-context";

export function RegisterPage(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await signUpWithEmail(name, email, password);
      await refresh();
      navigate("/app/dashboard", { replace: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("auth.registrationFailed");
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow={t("auth.signUpTitle")}
      title={t("auth.signUpTitle")}
      description={t("auth.signUpSubtitle")}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <TextInput
            label={t("auth.name")}
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
            placeholder={t("auth.namePlaceholder")}
            required
            autoComplete="name"
          />
          <TextInput
            label={t("auth.email")}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
            placeholder={t("auth.emailPlaceholder")}
            required
            autoComplete="email"
          />
          <PasswordInput
            label={t("auth.password")}
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
            placeholder={t("auth.passwordPlaceholder")}
            minLength={8}
            required
            autoComplete="new-password"
          />
          {error ? (
            <Alert
              color="red"
              icon={<IconAlertCircle size={16} />}
              px="sm"
              py="xs"
            >
              {error}
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
