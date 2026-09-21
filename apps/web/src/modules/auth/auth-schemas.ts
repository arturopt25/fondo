import { z } from "zod";

export interface AuthMessages {
  emailInvalid: string;
  emailRequired: string;
  nameRequired: string;
  passwordRequired: string;
  passwordMin: string;
}

export function createLoginSchema(messages: AuthMessages) {
  return z.object({
    email: z
      .string()
      .trim()
      .min(1, messages.emailRequired)
      .email(messages.emailInvalid),
    password: z.string().min(1, messages.passwordRequired),
  });
}

export type LoginInput = z.infer<ReturnType<typeof createLoginSchema>>;

export function createRegisterSchema(messages: AuthMessages) {
  return z.object({
    name: z.string().trim().min(2, messages.nameRequired),
    email: z
      .string()
      .trim()
      .min(1, messages.emailRequired)
      .email(messages.emailInvalid),
    password: z.string().min(8, messages.passwordMin),
  });
}

export type RegisterInput = z.infer<ReturnType<typeof createRegisterSchema>>;