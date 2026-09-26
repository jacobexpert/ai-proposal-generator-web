"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import { applyFieldErrors, describeApiError } from "@/lib/api/errors";

import { login } from "./api";
import { loginSchema, type LoginInput } from "./schemas";

function describeLoginError(error: unknown): { message: string; traceId?: string } {
  // Generic on purpose (US-FE-02 AC2): never reveal whether the email exists.
  if (error instanceof ApiError && error.status === 401) return { message: "Incorrect email or password." };
  const ui = describeApiError(error);
  if (ui.kind === "rate-limited") return { message: `Too many sign-in attempts. ${ui.message}` };
  if (ui.kind === "network") return { message: "We couldn't reach the server. Check your connection and try again." };
  return { message: `${ui.title}. ${ui.message}`, traceId: ui.traceId };
}

export function LoginForm({ returnUrl }: { returnUrl: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<{ message: string; traceId?: string } | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values);
    } catch (error) {
      applyFieldErrors(error, ["email", "password"] as const, setError);
      setFormError(describeLoginError(error));
      return;
    }
    // A new session must never see another user's cached data.
    queryClient.clear();
    router.replace(returnUrl);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5" aria-describedby="login-form-error">
      {formError && (
        <Alert tone="danger" id="login-form-error">
          <AlertCircle aria-hidden="true" />
          <div>
            <p>{formError.message}</p>
            {formError.traceId && (
              <p className="mt-1 font-mono text-mono-sm opacity-80">Trace ID: {formError.traceId}</p>
            )}
          </div>
        </Alert>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          placeholder="name@company.com"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...register("email")}
        />
        {errors.email && (
          <p id="email-error" className="text-body-sm text-danger">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? "password-error" : undefined}
          {...register("password")}
        />
        {errors.password && (
          <p id="password-error" className="text-body-sm text-danger">
            {errors.password.message}
          </p>
        )}
      </div>

      <Button type="submit" size="lg" className="mt-1 w-full" disabled={isSubmitting}>
        {isSubmitting && <LoaderCircle className="animate-spin" aria-hidden="true" />}
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
