import type { Metadata } from "next";
import Link from "next/link";

import { RegisterForm } from "@/features/auth/register-form";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <>
      <section aria-labelledby="register-title" className="rounded-2xl border border-border bg-card p-8 shadow-md">
        <h1 id="register-title" className="font-display text-page-title text-foreground">
          Create your account
        </h1>
        <p className="mt-1 mb-6 text-body-sm text-muted-foreground">
          You&apos;ll get your own workspace to start writing proposals.
        </p>
        <RegisterForm />
      </section>
      <p className="mt-6 text-center text-body-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-text hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
