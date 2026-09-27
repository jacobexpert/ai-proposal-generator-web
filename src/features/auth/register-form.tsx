"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useForm, useWatch, type FieldError } from "react-hook-form";

import { notifySuccess } from "@/components/feedback/notify";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import { applyFieldErrors, describeApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

import { register as registerAccount } from "./api";
import { PASSWORD_MIN, registerFormSchema, type RegisterFormInput } from "./schemas";

type FormError = { message: string; traceId?: string; signInLink?: boolean };

/** US-FE-42 AC4: map API failures to what the user can do next. */
export function describeRegisterError(error: unknown): FormError {
  if (error instanceof ApiError && error.status === 409)
    return { message: "An account with this email already exists.", signInLink: true };
  const ui = describeApiError(error);
  if (ui.kind === "rate-limited") return { message: `Too many sign-up attempts. ${ui.message}` };
  if (ui.kind === "network") return { message: "We couldn't reach the server. Check your connection and try again." };
  if (ui.kind === "validation") return { message: "Some details need fixing. Check the highlighted fields." };
  return { message: `${ui.title}. ${ui.message}`, traceId: ui.traceId };
}

const FIELDS = ["email", "displayName", "password", "workspaceName"] as const;

export function RegisterForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<FormError | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormInput>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { email: "", displayName: "", password: "", confirmPassword: "", workspaceName: "" },
  });
  const [displayName, password] = useWatch({ control, name: ["displayName", "password"] });
  const workspacePlaceholder = `${displayName.trim() || "Your name"}'s workspace`;

  const onSubmit = handleSubmit(async ({ email, displayName, password, workspaceName }) => {
    const values = { email, displayName, password, workspaceName };
    setFormError(null);
    try {
      await registerAccount(values);
    } catch (error) {
      const unmatched = applyFieldErrors(error, FIELDS, setError);
      const described = describeRegisterError(error);
      setFormError(unmatched.length ? { ...described, message: unmatched.join(" ") } : described);
      return;
    }
    // The BFF set the session and remembered the new workspace (AC3).
    queryClient.clear();
    notifySuccess(`Welcome, ${values.displayName.trim()}!`, "Your workspace is ready.");
    router.replace("/");
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5" aria-describedby="register-form-error">
      {formError && (
        <Alert tone="danger" id="register-form-error">
          <AlertCircle aria-hidden="true" />
          <div>
            <p>
              {formError.message}{" "}
              {formError.signInLink && (
                <Link href="/login" className="font-medium underline underline-offset-2">
                  Sign in instead
                </Link>
              )}
            </p>
            {formError.traceId && (
              <p className="mt-1 font-mono text-mono-sm opacity-80">Trace ID: {formError.traceId}</p>
            )}
          </div>
        </Alert>
      )}

      <Field id="email" label="Work email" error={errors.email}>
        {(aria) => (
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="name@company.com"
            {...aria}
            {...register("email")}
          />
        )}
      </Field>

      <Field id="displayName" label="Your name" error={errors.displayName}>
        {(aria) => (
          <Input id="displayName" autoComplete="name" maxLength={200} {...aria} {...register("displayName")} />
        )}
      </Field>

      <Field
        id="password"
        label="Password"
        error={errors.password}
        hint={<PasswordLength length={password.length} />}
        hintText={`At least ${PASSWORD_MIN} characters, and not your email.`}
      >
        {(aria) => (
          <Input id="password" type="password" autoComplete="new-password" {...aria} {...register("password")} />
        )}
      </Field>

      <Field id="confirmPassword" label="Confirm password" error={errors.confirmPassword}>
        {(aria) => (
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...aria}
            {...register("confirmPassword")}
          />
        )}
      </Field>

      <Field
        id="workspaceName"
        label="Workspace name"
        optional
        error={errors.workspaceName}
        hintText="Your team's space for proposals. You can rename it later."
      >
        {(aria) => (
          <Input
            id="workspaceName"
            maxLength={200}
            placeholder={workspacePlaceholder}
            {...aria}
            {...register("workspaceName")}
          />
        )}
      </Field>

      <Button type="submit" size="lg" className="mt-1 w-full" disabled={isSubmitting}>
        {isSubmitting && <LoaderCircle className="animate-spin" aria-hidden="true" />}
        {isSubmitting ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}

/** Live length check for the password (AC2); the rule itself is in the field's description. */
function PasswordLength({ length }: { length: number }) {
  const ok = length >= PASSWORD_MIN;
  return (
    <span aria-hidden="true" className={cn("inline-flex items-center gap-1 tabular-nums", ok && "text-success")}>
      {ok && <Check className="size-3.5" />}
      {Math.min(length, 999)}/{PASSWORD_MIN}
    </span>
  );
}

function Field({
  id,
  label,
  optional,
  error,
  hint,
  hintText,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  error?: FieldError;
  hint?: ReactNode;
  hintText?: string;
  children: (aria: { "aria-invalid"?: true; "aria-describedby"?: string }) => ReactNode;
}) {
  const describedBy = [hintText && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}
        {optional && <span className="font-normal text-muted-foreground"> (optional)</span>}
      </Label>
      {children({ "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {(hintText || hint) && (
        <p className="flex items-start justify-between gap-3 text-caption text-muted-foreground">
          <span id={`${id}-hint`}>{hintText}</span>
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-body-sm text-danger">
          {error.message}
        </p>
      )}
    </div>
  );
}
