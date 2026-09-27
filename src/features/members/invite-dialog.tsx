"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, AlertTriangle, Check, Copy, LoaderCircle, UserPlus } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_LABEL, type WorkspaceRole } from "@/features/workspaces";
import { ApiError } from "@/lib/api/client";
import { applyFieldErrors, describeApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

import { inviteMember, type CreatedInvitation, type Invitation, type Member } from "./api";
import { formatDate } from "./format";
import { invitationsKey } from "./queries";

const inviteSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter an email address.")
    .max(320, "Email is too long.")
    .pipe(z.email("Enter a valid email.")),
  role: z.enum(["MEMBER", "OWNER"]),
});
type InviteInput = z.infer<typeof inviteSchema>;

const ROLE_HELP: Record<WorkspaceRole, string> = {
  MEMBER: "Works on proposals and documents.",
  OWNER: "Also manages members, invitations and workspace settings.",
};

/** US-FE-44 AC3: invite by email; the one-time link is shown once, here, and nowhere else. */
export function InviteDialog({
  workspaceId,
  members,
  invitations,
  open,
  onOpenChange,
}: {
  workspaceId: string;
  members: readonly Member[];
  invitations: readonly Invitation[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [created, setCreated] = useState<CreatedInvitation | null>(null);
  const [formError, setFormError] = useState<{ message: string; traceId?: string } | null>(null);
  const form = useForm<InviteInput>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "MEMBER" },
  });
  const {
    register,
    handleSubmit,
    setError,
    reset,
    control,
    formState: { errors },
  } = form;
  const email = useWatch({ control, name: "email" }).trim().toLowerCase();
  const role = useWatch({ control, name: "role" });
  const replacesPending = email.length > 0 && invitations.some((i) => i.email.toLowerCase() === email);
  const alreadyMember = email.length > 0 && members.some((m) => m.email.toLowerCase() === email);

  const invite = useMutation({
    mutationFn: (input: InviteInput) => inviteMember(workspaceId, input),
    meta: { errorToast: false },
    gcTime: 0, // the token must not linger in the mutation cache
    onSuccess: (result) => {
      setCreated(result);
      void queryClient.invalidateQueries({ queryKey: invitationsKey(workspaceId) });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        setError("email", { message: "This person is already a member of the workspace." });
        return;
      }
      const unmatched = applyFieldErrors(error, ["email", "role"] as const, setError);
      const ui = describeApiError(error);
      setFormError(
        unmatched.length
          ? { message: unmatched.join(" ") }
          : ui.kind === "validation"
            ? null
            : {
                message: `${ui.title}. ${ui.message}`,
                traceId: ui.traceId,
              },
      );
    },
  });

  const handleOpenChange = (next: boolean) => {
    if (invite.isPending) return;
    if (!next) {
      // Closing forgets the link for good (AC3: shown only once).
      setCreated(null);
      setFormError(null);
      reset();
      invite.reset();
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        {created ? (
          <InvitationCreated created={created} />
        ) : (
          <form
            noValidate
            onSubmit={handleSubmit((values) => {
              setFormError(null);
              invite.mutate(values);
            })}
          >
            <DialogTitle>Invite a member</DialogTitle>
            <DialogDescription>
              You&apos;ll get a link to send them. They join after signing in or creating an account.
            </DialogDescription>

            <div className="mt-5 flex flex-col gap-5">
              {formError && (
                <Alert tone="danger">
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
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  autoComplete="off"
                  placeholder="colleague@company.com"
                  aria-invalid={errors.email ? true : undefined}
                  aria-describedby={errors.email ? "invite-email-error" : undefined}
                  {...register("email")}
                />
                {errors.email && (
                  <p id="invite-email-error" className="text-body-sm text-danger">
                    {errors.email.message}
                  </p>
                )}
                {!errors.email && alreadyMember && (
                  <p className="text-caption text-muted-foreground">This person is already a member.</p>
                )}
              </div>

              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1.5 text-body-sm font-medium text-foreground">Role</legend>
                {(["MEMBER", "OWNER"] as const).map((value) => (
                  <label
                    key={value}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors has-focus-visible:shadow-(--focus-ring)",
                      role === value && "border-brand-line bg-brand-subtle",
                    )}
                  >
                    <input type="radio" value={value} className="mt-1 accent-brand" {...register("role")} />
                    <span>
                      <span className="block text-body-sm font-medium text-foreground">{ROLE_LABEL[value]}</span>
                      <span className="block text-caption text-muted-foreground">{ROLE_HELP[value]}</span>
                    </span>
                  </label>
                ))}
              </fieldset>

              {replacesPending && (
                <Alert tone="warning">
                  <AlertTriangle aria-hidden="true" />
                  <p>This email already has a pending invitation. Sending a new one cancels the old link.</p>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" disabled={invite.isPending} />}>
                Cancel
              </DialogClose>
              <Button type="submit" disabled={invite.isPending}>
                {invite.isPending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <UserPlus />}
                {invite.isPending ? "Creating link…" : "Create invitation"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InvitationCreated({ created }: { created: CreatedInvitation }) {
  const [copied, setCopied] = useState<"yes" | "failed" | null>(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(created.link);
      setCopied("yes");
    } catch {
      setCopied("failed");
    }
  };

  return (
    <div>
      <DialogTitle>Invitation link ready</DialogTitle>
      <DialogDescription>
        Send this link to <span className="font-medium break-all text-foreground">{created.email}</span> (
        {ROLE_LABEL[created.role]}).
      </DialogDescription>

      <div className="mt-5 flex flex-col gap-3">
        <Label htmlFor="invitation-link">Invitation link</Label>
        <div className="flex gap-2">
          <Input
            id="invitation-link"
            readOnly
            value={created.link}
            onFocus={(e) => e.currentTarget.select()}
            className="font-mono text-mono-sm"
          />
          <Button type="button" variant="outline" onClick={copy} aria-label="Copy link">
            {copied === "yes" ? <Check /> : <Copy />}
            {copied === "yes" ? "Copied" : "Copy"}
          </Button>
        </div>
        <p role="status" className="text-caption text-muted-foreground">
          {copied === "failed"
            ? "Couldn't copy automatically. Select the link and copy it."
            : copied === "yes"
              ? "Link copied to the clipboard."
              : ""}
        </p>
        <Alert tone="warning">
          <AlertTriangle aria-hidden="true" />
          <p>
            This link is shown only now and expires on {formatDate(created.expiresAt)} (7 days). Send it to the person
            you invited — anyone with the link can use it with that email address.
          </p>
        </Alert>
      </div>

      <DialogFooter>
        <DialogClose render={<Button type="button" />}>Done</DialogClose>
      </DialogFooter>
    </div>
  );
}
