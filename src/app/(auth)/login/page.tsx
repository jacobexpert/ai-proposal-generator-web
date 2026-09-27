import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/features/auth/login-form";
import { safeReturnUrl } from "@/lib/return-url";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnUrl?: string | string[] }>;
}) {
  const { returnUrl } = await searchParams;
  const target = safeReturnUrl(Array.isArray(returnUrl) ? returnUrl[0] : returnUrl);

  return (
    <>
      <section aria-labelledby="login-title" className="rounded-2xl border border-border bg-card p-8 shadow-md">
        <h1 id="login-title" className="font-display text-page-title text-foreground">
          Sign in
        </h1>
        <p className="mt-1 mb-6 text-body-sm text-muted-foreground">Welcome back. Use your work email to continue.</p>
        <LoginForm returnUrl={target} />
      </section>
      <p className="mt-6 text-center text-body-sm text-muted-foreground">
        New here?{" "}
        <Link href="/register" className="font-medium text-brand-text hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}
