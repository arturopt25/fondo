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
import { signInWithEmail } from "./auth-client";
import { useAuth } from "./auth-context";

export function LoginPage(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await signInWithEmail(email, password);
      await refresh();
      navigate("/app/dashboard", { replace: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("auth.invalidCredentials");
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow={t("auth.signInTitle")}
      title={t("auth.signInTitle")}
      description={t("auth.signInSubtitle")}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
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
            required
            autoComplete="current-password"
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
