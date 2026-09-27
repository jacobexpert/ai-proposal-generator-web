"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, AlertTriangle, LoaderCircle, MailX, UsersRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { notifySuccess } from "@/components/feedback/notify";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { logout } from "@/features/auth/api";
import { LoginForm } from "@/features/auth/login-form";
import { RegisterForm } from "@/features/auth/register-form";
import { ROLE_LABEL, rememberWorkspace, useCurrentUser } from "@/features/workspaces";
import { ApiError } from "@/lib/api/client";
import { describeApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

import { acceptInvitation, lookupInvitation, type InvitationPreview } from "./api";
import { clearStoredToken, readStoredToken, storeToken, stripTokenFromUrl } from "./invitation-token";

const RETURN_URL = "/invitations/accept";
const noSubscribe = () => () => {};

const isGone = (error: unknown) => error instanceof ApiError && (error.status === 404 || error.status === 400);

/**
 * US-FE-43: `/invitations/accept?token=…`. One page for every state so the token never has to
 * travel through other URLs: preview → sign in / create account → join.
 */
export function InvitationFlow({ urlToken, signedIn }: { urlToken?: string; signedIn: boolean }) {
  // Token from this page load's URL, else from this tab's sessionStorage (after signing in).
  const storedToken = useSyncExternalStore(noSubscribe, readStoredToken, () => undefined);
  const token = urlToken ?? storedToken;
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    if (!urlToken) return;
    storeToken(urlToken);
    stripTokenFromUrl();
  }, [urlToken]);

  const lookup = useQuery({
    queryKey: ["invitation", token],
    queryFn: ({ signal }) => lookupInvitation(token!, signal),
    enabled: !!token && !invalid,
    retry: false,
    staleTime: Infinity,
  });

  const markInvalid = () => {
    clearStoredToken();
    setInvalid(true);
  };

  if (!token || invalid || (lookup.isError && isGone(lookup.error))) return <InvitationInvalid />;
  if (lookup.isPending) return <LoadingState label="Checking your invitation" rows={2} />;
  if (lookup.isError) return <ErrorState error={lookup.error} onRetry={() => void lookup.refetch()} />;

  return (
    <section aria-labelledby="invitation-title" className="rounded-2xl border border-border bg-card p-8 shadow-md">
      <InvitationSummary preview={lookup.data} />
      <div className="mt-6 border-t border-border pt-6">
        {signedIn ? (
          <SignedInStep token={token} preview={lookup.data} onInvalid={markInvalid} />
        ) : (
          <SignedOutStep token={token} preview={lookup.data} onInvalid={markInvalid} />
        )}
      </div>
    </section>
  );
}

function InvitationSummary({ preview }: { preview: InvitationPreview }) {
  const expires = new Date(preview.expiresAt);
  return (
    <div>
      <span className="flex size-10 items-center justify-center rounded-lg bg-brand-subtle text-brand-text">
        <UsersRound aria-hidden="true" className="size-5" />
      </span>
      <h1 id="invitation-title" className="mt-4 font-display text-page-title text-foreground">
        Join “{preview.workspaceName}”
      </h1>
      <dl className="mt-4 grid grid-cols-[6rem_1fr] gap-x-3 gap-y-2 text-body-sm">
        <dt className="text-muted-foreground">Invited</dt>
        <dd className="break-all text-foreground">{preview.email}</dd>
        <dt className="text-muted-foreground">Role</dt>
        <dd className="text-foreground">{ROLE_LABEL[preview.role]}</dd>
        {!Number.isNaN(expires.getTime()) && (
          <>
            <dt className="text-muted-foreground">Expires</dt>
            <dd className="text-foreground">
              <time dateTime={preview.expiresAt}>
                {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(expires)}
              </time>
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}

/** AC3: sign in (email prefilled) or create an account bound to the invitation. */
function SignedOutStep({
  token,
  preview,
  onInvalid,
}: {
  token: string;
  preview: InvitationPreview;
  onInvalid: () => void;
}) {
  const [mode, setMode] = useState<"sign-in" | "create">("sign-in");
  return (
    <div className="flex flex-col gap-5">
      <div
        role="group"
        aria-label="How do you want to continue?"
        className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
      >
        {(
          [
            ["sign-in", "I have an account"],
            ["create", "Create an account"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            onClick={() => setMode(value)}
            className={cn(
              "h-control-sm rounded-md text-body-sm font-medium text-muted-foreground transition-colors",
              mode === value && "bg-card text-foreground shadow-sm",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {mode === "sign-in" ? (
        // After signing in, the login form returns here and the token is read from this tab's storage.
        <LoginForm returnUrl={RETURN_URL} defaultEmail={preview.email} />
      ) : (
        <RegisterForm
          invitation={{
            token,
            email: preview.email,
            workspaceName: preview.workspaceName,
            onSignInInstead: () => setMode("sign-in"),
            onInvalid,
            onJoined: clearStoredToken,
          }}
        />
      )}
    </div>
  );
}

/** AC4–AC6: join with the right account; explain the wrong account; handle "already a member". */
function SignedInStep({
  token,
  preview,
  onInvalid,
}: {
  token: string;
  preview: InvitationPreview;
  onInvalid: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const me = useCurrentUser();
  const [alreadyMember, setAlreadyMember] = useState(false);

  const leave = (workspaceId?: string) => {
    clearStoredToken();
    if (workspaceId) rememberWorkspace(workspaceId);
    queryClient.clear();
    router.replace("/");
    router.refresh();
  };

  const accept = useMutation({
    mutationFn: () => acceptInvitation(token),
    meta: { errorToast: false },
    onSuccess: (workspace) => {
      notifySuccess(`You've joined “${workspace.name}”.`);
      leave(workspace.id);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 404) onInvalid();
      if (error instanceof ApiError && error.status === 409) setAlreadyMember(true);
    },
  });

  const signOut = useMutation({
    mutationFn: logout,
    meta: { errorToast: false },
    // Full reload of this page: drops every cached query of the old account at once (no refetch
    // with a dead session); the token stays in this tab so the right account can sign in next.
    onSettled: () => window.location.replace(RETURN_URL),
  });

  if (me.isPending) return <LoadingState label="Loading your account" rows={1} />;
  if (me.isError) return <ErrorState error={me.error} onRetry={() => void me.refetch()} />;

  const wrongAccount =
    me.data.email.trim().toLowerCase() !== preview.email.trim().toLowerCase() ||
    (accept.error instanceof ApiError && accept.error.status === 403);

  if (alreadyMember) {
    // The preview has no workspace id; pick it by name only when that is unambiguous.
    const matches = me.data.workspaces.filter((w) => w.name === preview.workspaceName);
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="info">
          <UsersRound aria-hidden="true" />
          <p>You&apos;re already a member of “{preview.workspaceName}”.</p>
        </Alert>
        <Button size="lg" className="w-full" onClick={() => leave(matches.length === 1 ? matches[0]!.id : undefined)}>
          Open workspace
        </Button>
      </div>
    );
  }

  if (wrongAccount) {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="warning">
          <AlertTriangle aria-hidden="true" />
          <div>
            <p className="font-medium">This invitation is for a different account.</p>
            <p className="mt-1">
              Invited: <span className="font-medium break-all">{preview.email}</span>
              <br />
              Signed in as: <span className="font-medium break-all">{me.data.email}</span>
            </p>
          </div>
        </Alert>
        <Button size="lg" className="w-full" disabled={signOut.isPending} onClick={() => signOut.mutate()}>
          {signOut.isPending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
          Sign out and switch account
        </Button>
        <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Back to my workspace
        </Link>
      </div>
    );
  }

  const failure =
    accept.isError && !(accept.error instanceof ApiError && [403, 404, 409].includes(accept.error.status));
  const ui = failure ? describeApiError(accept.error) : undefined;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-sm text-muted-foreground">
        Signed in as <span className="font-medium text-foreground">{me.data.email}</span>.
      </p>
      {ui && (
        <Alert tone="danger">
          <AlertCircle aria-hidden="true" />
          <div>
            <p>
              {ui.title}. {ui.message}
            </p>
            {ui.traceId && <p className="mt-1 font-mono text-mono-sm opacity-80">Trace ID: {ui.traceId}</p>}
          </div>
        </Alert>
      )}
      <Button size="lg" className="w-full" disabled={accept.isPending} onClick={() => accept.mutate()}>
        {accept.isPending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
        {accept.isPending ? "Joining…" : "Join workspace"}
      </Button>
    </div>
  );
}

/** AC2: one message for invalid, expired, used or revoked (the API does not say which). */
export function InvitationInvalid() {
  return (
    <section className="rounded-2xl border border-border bg-card p-2 shadow-md">
      <EmptyState
        icon={MailX}
        title="This invitation is no longer valid"
        description="It may have expired, been used already or been withdrawn. Ask the person who invited you to send a new link."
        action={
          <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Go to the app
          </Link>
        }
      />
    </section>
  );
}
