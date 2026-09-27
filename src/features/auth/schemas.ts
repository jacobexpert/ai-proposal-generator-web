import { z } from "zod";

const email = z
  .string()
  .trim()
  .min(1, "Enter your email.")
  .max(320, "Email is too long.")
  .pipe(z.email("Enter a valid email."));

/** Mirrors the API's LoginRequest constraints (email ≤ 320, password ≤ 128). */
export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password.").max(128, "Password is too long."),
});

export type LoginInput = z.infer<typeof loginSchema>;

/** Password policy of the API (spec US-BE-03 BR-02): 12–128 characters, not the email. */
export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;

const sameAsEmail = (password: string, emailValue: string) =>
  emailValue.length > 0 && password.trim().toLowerCase() === emailValue.trim().toLowerCase();

/**
 * `POST /api/auth/register` body (RegisterRequest), validated again in the BFF.
 * `invitationToken` is used by the invitation flow (US-FE-43).
 */
export const registerRequestSchema = z
  .object({
    email,
    password: z
      .string()
      .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`)
      .max(PASSWORD_MAX, `Use at most ${PASSWORD_MAX} characters.`),
    displayName: z.string().trim().min(1, "Enter your name.").max(200, "Use at most 200 characters."),
    workspaceName: z
      .string()
      .trim()
      .max(200, "Use at most 200 characters.")
      .optional()
      .transform((v) => v || undefined),
    invitationToken: z.string().min(1).max(256).optional(),
  })
  .superRefine((v, ctx) => {
    if (sameAsEmail(v.password, v.email))
      ctx.addIssue({ code: "custom", path: ["password"], message: "Your password can't be your email." });
  });

export type RegisterRequest = z.input<typeof registerRequestSchema>;

/** The sign-up form: the request plus a password confirmation (US-FE-42 AC1–AC2). */
export const registerFormSchema = z
  .object({
    email,
    displayName: z.string().trim().min(1, "Enter your name.").max(200, "Use at most 200 characters."),
    password: z
      .string()
      .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`)
      .max(PASSWORD_MAX, `Use at most ${PASSWORD_MAX} characters.`),
    confirmPassword: z.string().min(1, "Confirm your password."),
    workspaceName: z.string().trim().max(200, "Use at most 200 characters."),
  })
  .superRefine((v, ctx) => {
    if (sameAsEmail(v.password, v.email))
      ctx.addIssue({ code: "custom", path: ["password"], message: "Your password can't be your email." });
    if (v.confirmPassword && v.confirmPassword !== v.password)
      ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords don't match." });
  });

export type RegisterFormInput = z.infer<typeof registerFormSchema>;
