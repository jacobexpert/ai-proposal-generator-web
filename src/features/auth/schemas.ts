import { z } from "zod";

/** Mirrors the API's LoginRequest constraints (email ≤ 320, password ≤ 128). */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email.")
    .max(320, "Email is too long.")
    .pipe(z.email("Enter a valid email.")),
  password: z.string().min(1, "Enter your password.").max(128, "Password is too long."),
});

export type LoginInput = z.infer<typeof loginSchema>;
