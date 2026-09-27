"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, LoaderCircle, LogOut } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { notifySuccess } from "@/components/feedback/notify";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import { applyFieldErrors, describeApiError } from "@/lib/api/errors";

import { fetchWorkspace, leaveWorkspace, renameWorkspace } from "./api";
import { meKey, workspaceKey } from "./query-keys";
import { ROLE_LABEL } from "./role-label";
import { useCurrentWorkspace, useWorkspaceContext } from "./workspace-context";

const renameSchema = z.object({
  name: z.string().trim().min(1, "Enter a workspace name.").max(200, "Use at most 200 characters."),
});
type RenameInput = z.infer<typeof renameSchema>;

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

export const LAST_OWNER_LEAVE_MESSAGE =
  "You're the only owner. Make someone else an owner in Settings › Members before you leave.";

/** US-FE-45: Settings › General — workspace details, rename (OWNER), leave (everyone). */
export function WorkspaceGeneral() {
  const workspace = useCurrentWorkspace();
  const { user, markLeaving } = useWorkspaceContext();
  const isOwner = workspace.role === "OWNER";
  const queryClient = useQueryClient();
  const details = useQuery({
    queryKey: workspaceKey(workspace.id, "details"),
    queryFn: ({ signal }) => fetchWorkspace(workspace.id, signal),
  });
  const [leaveOpen, setLeaveOpen] = useState(false);

  const leave = async () => {
    if (!user) return;
    markLeaving(workspace.id);
    try {
      await leaveWorkspace(workspace.id, user.id);
    } catch (error) {
      markLeaving("");
      throw error;
    }
    notifySuccess(`You left “${workspace.name}”.`);
    // The workspace disappears from /api/me; the workspace context moves to another one (or none).
    await queryClient.invalidateQueries({ queryKey: meKey });
  };

  const created = details.data ? new Date(details.data.createdAt) : undefined;

  return (
    <div className="grid max-w-3xl gap-6">
      <section aria-labelledby="workspace-heading" className="rounded-xl border border-border bg-card p-6">
        <h2 id="workspace-heading" className="text-panel-title font-semibold text-foreground">
          Workspace
        </h2>
        <dl className="mt-4 grid grid-cols-[10rem_1fr] gap-x-4 gap-y-3 text-body-sm">
          <dt className="text-muted-foreground">Your role</dt>
          <dd className="text-foreground">{ROLE_LABEL[workspace.role]}</dd>
          <dt className="text-muted-foreground">Created</dt>
          <dd className="text-foreground">
            {created && !Number.isNaN(created.getTime()) ? dateFormat.format(created) : details.isError ? "—" : "…"}
          </dd>
        </dl>
        <div className="mt-6 border-t border-border pt-6">
          {isOwner ? (
            <RenameForm key={workspace.id} workspaceId={workspace.id} currentName={workspace.name} />
          ) : (
            <div className="flex flex-col gap-1.5">
              <p className="text-body-sm font-medium text-foreground">Name</p>
              <p className="text-body-sm text-foreground">{workspace.name}</p>
              <p className="text-caption text-muted-foreground">Only owners can rename the workspace.</p>
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="leave-heading" className="rounded-xl border border-border bg-card p-6">
        <h2 id="leave-heading" className="text-panel-title font-semibold text-foreground">
          Leave workspace
        </h2>
        <p className="mt-1 text-body-sm text-muted-foreground">
          You lose access to its proposals and documents. An owner can invite you again.
          {isOwner && (
            <>
              {" "}
              If you&apos;re the only owner, first make someone else an owner in{" "}
              <Link href="/settings/members" className="font-medium text-brand-text hover:underline">
                Members
              </Link>
              .
            </>
          )}
        </p>
        <Button variant="outline" className="mt-4" onClick={() => setLeaveOpen(true)} disabled={!user}>
          <LogOut />
          Leave workspace
        </Button>
      </section>

      <ConfirmDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        title={`Leave “${workspace.name}”?`}
        description="You'll lose access right away. To come back, an owner has to invite you again."
        confirmLabel="Leave workspace"
        tone="destructive"
        onConfirm={leave}
        describeError={(e) => (e instanceof ApiError && e.status === 409 ? LAST_OWNER_LEAVE_MESSAGE : undefined)}
      />
    </div>
  );
}

function RenameForm({ workspaceId, currentName }: { workspaceId: string; currentName: string }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<{ message: string; traceId?: string } | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm<RenameInput>({ resolver: zodResolver(renameSchema), defaultValues: { name: currentName } });

  const rename = useMutation({
    mutationFn: (name: string) => renameWorkspace(workspaceId, name),
    meta: { errorToast: false },
    onSuccess: async (updated) => {
      reset({ name: updated.name });
      notifySuccess("Workspace renamed.");
      // The switcher, user menu and page headers all read the name from /api/me.
      await queryClient.invalidateQueries({ queryKey: meKey });
      queryClient.setQueryData(workspaceKey(workspaceId, "details"), updated);
    },
    onError: (error) => {
      const unmatched = applyFieldErrors(error, ["name"] as const, setError);
      const ui = describeApiError(error);
      if (ui.kind === "validation" && unmatched.length === 0) return;
      setFormError({ message: unmatched.join(" ") || `${ui.title}. ${ui.message}`, traceId: ui.traceId });
    },
  });

  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={handleSubmit(({ name }) => {
        setFormError(null);
        rename.mutate(name);
      })}
    >
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
        <Label htmlFor="workspace-name">Name</Label>
        <div className="flex gap-2">
          <Input
            id="workspace-name"
            maxLength={200}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "workspace-name-error" : undefined}
            {...register("name")}
          />
          <Button type="submit" disabled={!isDirty || rename.isPending}>
            {rename.isPending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
            Save
          </Button>
        </div>
        {errors.name && (
          <p id="workspace-name-error" className="text-body-sm text-danger">
            {errors.name.message}
          </p>
        )}
      </div>
    </form>
  );
}
