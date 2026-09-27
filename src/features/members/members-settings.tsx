"use client";

import { useQueryClient } from "@tanstack/react-query";
import { MailX, MoreHorizontal, ShieldCheck, UserMinus, UserPlus, UsersRound } from "lucide-react";
import { useState } from "react";

import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { notifySuccess } from "@/components/feedback/notify";
import { initials } from "@/components/layout/app-topbar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { meKey, ROLE_LABEL, useCurrentWorkspace, useWorkspaceContext, type WorkspaceRole } from "@/features/workspaces";
import { ApiError } from "@/lib/api/client";

import { changeMemberRole, removeMember, revokeInvitation, type Invitation, type Member } from "./api";
import { formatDate, OWNER_REQUIRED_MESSAGE } from "./format";
import { InviteDialog } from "./invite-dialog";
import { invitationsKey, membersKey, useInvitations, useMembers } from "./queries";

type PendingAction =
  | { kind: "role"; member: Member; role: WorkspaceRole }
  | { kind: "remove"; member: Member }
  | { kind: "revoke"; invitation: Invitation };

const lastOwner = (error: unknown) =>
  error instanceof ApiError && error.status === 409 ? OWNER_REQUIRED_MESSAGE : undefined;

/** US-FE-44: Settings › Members. Everyone sees members; only owners manage them (AC2). */
export function MembersSettings() {
  const workspace = useCurrentWorkspace();
  const { user } = useWorkspaceContext();
  const isOwner = workspace.role === "OWNER";
  const queryClient = useQueryClient();
  const members = useMembers(workspace.id);
  const invitations = useInvitations(workspace.id, isOwner);
  const [inviteOpen, setInviteOpen] = useState(false);
  // Kept after closing so the dialog's text doesn't vanish during its exit animation.
  const [pending, setPendingAction] = useState<PendingAction | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const setPending = (action: PendingAction) => {
    setPendingAction(action);
    setConfirmOpen(true);
  };

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: membersKey(workspace.id) });
    void queryClient.invalidateQueries({ queryKey: invitationsKey(workspace.id) });
  };

  const confirm = async () => {
    if (!pending) return;
    try {
      if (pending.kind === "role") {
        await changeMemberRole(workspace.id, pending.member.userId, pending.role);
        notifySuccess(`${pending.member.displayName} is now ${ROLE_LABEL[pending.role].toLowerCase()}.`);
      } else if (pending.kind === "remove") {
        await removeMember(workspace.id, pending.member.userId);
        notifySuccess(`${pending.member.displayName} was removed from the workspace.`);
      } else {
        await revokeInvitation(workspace.id, pending.invitation.id);
        notifySuccess(`Invitation for ${pending.invitation.email} revoked.`);
      }
    } catch (error) {
      // Already gone (someone else acted first): nothing left to do, just show the current state.
      if (!(error instanceof ApiError && error.status === 404)) throw error;
    } finally {
      refresh();
    }
    // An owner's own role can change elsewhere; keep the workspace list (and our role) current.
    void queryClient.invalidateQueries({ queryKey: meKey });
  };

  // The page title ("Settings") comes from the settings layout; this is the section header.
  const header = (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="text-panel-title font-semibold text-foreground">Members</h2>
        <p className="mt-1 text-body-sm text-muted-foreground">People in “{workspace.name}”.</p>
      </div>
      {isOwner && (
        <Button onClick={() => setInviteOpen(true)} disabled={!members.data}>
          <UserPlus />
          Invite member
        </Button>
      )}
    </div>
  );

  if (members.isPending)
    return (
      <>
        {header}
        <LoadingState label="Loading members" />
      </>
    );
  if (members.isError)
    return (
      <>
        {header}
        <ErrorState error={members.error} onRetry={() => void members.refetch()} />
      </>
    );

  const membersTable = (
    <MembersTable
      members={members.data}
      currentUserId={user?.id}
      canManage={isOwner}
      onChangeRole={(member, role) => setPending({ kind: "role", member, role })}
      onRemove={(member) => setPending({ kind: "remove", member })}
    />
  );

  return (
    <>
      {header}
      {isOwner ? (
        <Tabs defaultValue="members">
          <TabsList>
            <TabsTab value="members">
              Members <Count value={members.data.length} />
            </TabsTab>
            <TabsTab value="invitations">
              Pending invitations {invitations.data && <Count value={invitations.data.length} />}
            </TabsTab>
          </TabsList>
          <TabsPanel value="members">{membersTable}</TabsPanel>
          <TabsPanel value="invitations">
            {invitations.isPending ? (
              <LoadingState label="Loading invitations" rows={2} />
            ) : invitations.isError ? (
              <ErrorState error={invitations.error} onRetry={() => void invitations.refetch()} />
            ) : (
              <InvitationsTable
                invitations={invitations.data}
                onRevoke={(invitation) => setPending({ kind: "revoke", invitation })}
                onInvite={() => setInviteOpen(true)}
              />
            )}
          </TabsPanel>
        </Tabs>
      ) : (
        membersTable
      )}

      {isOwner && (
        <InviteDialog
          workspaceId={workspace.id}
          members={members.data}
          invitations={invitations.data ?? []}
          open={inviteOpen}
          onOpenChange={setInviteOpen}
        />
      )}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        {...confirmCopy(pending)}
        onConfirm={confirm}
        describeError={lastOwner}
      />
    </>
  );
}

function confirmCopy(action: PendingAction | null) {
  if (!action) return { title: "" };
  if (action.kind === "role") {
    const promote = action.role === "OWNER";
    return {
      title: promote ? `Make ${action.member.displayName} an owner?` : `Make ${action.member.displayName} a member?`,
      description: promote
        ? "Owners can invite and remove people, change roles and edit workspace settings."
        : "They keep working on proposals but can no longer manage members or workspace settings.",
      confirmLabel: promote ? "Make owner" : "Make member",
    };
  }
  if (action.kind === "remove") {
    return {
      title: `Remove ${action.member.displayName}?`,
      description: `${action.member.email} loses access to every proposal and document in this workspace. You can invite them again later.`,
      confirmLabel: "Remove",
      tone: "destructive" as const,
    };
  }
  return {
    title: "Revoke this invitation?",
    description: `The link sent to ${action.invitation.email} stops working. You can invite them again later.`,
    confirmLabel: "Revoke",
    tone: "destructive" as const,
  };
}

function Count({ value }: { value: number }) {
  return <span className="rounded-full bg-muted px-2 text-caption text-muted-foreground tabular-nums">{value}</span>;
}

function MembersTable({
  members,
  currentUserId,
  canManage,
  onChangeRole,
  onRemove,
}: {
  members: readonly Member[];
  currentUserId?: string;
  canManage: boolean;
  onChangeRole: (member: Member, role: WorkspaceRole) => void;
  onRemove: (member: Member) => void;
}) {
  if (members.length === 0) return <EmptyState icon={UsersRound} title="No members yet" />;
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <table className="w-full text-body-sm">
        <caption className="sr-only">Workspace members</caption>
        <thead>
          <tr className="border-b border-border text-left text-caption text-muted-foreground">
            <th scope="col" className="px-4 py-2.5 font-medium">
              Name
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              Role
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              Joined
            </th>
            {canManage && (
              <th scope="col" className="w-12 px-4 py-2.5">
                <span className="sr-only">Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {members.map((member) => {
            const isMe = member.userId.toLowerCase() === currentUserId?.toLowerCase();
            return (
              <tr key={member.userId} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-caption font-semibold text-foreground"
                    >
                      {initials(member.displayName)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {member.displayName}
                        {isMe && <span className="ml-2 text-caption font-normal text-muted-foreground">(you)</span>}
                      </p>
                      <p className="truncate text-caption text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge tone={member.role === "OWNER" ? "info" : "neutral"}>
                    {ROLE_LABEL[member.role]}
                  </StatusBadge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(member.joinedAt)}</td>
                {canManage && (
                  <td className="px-4 py-3 text-right">
                    {/* Your own membership (leave / step down) is in Settings › General (US-FE-45). */}
                    {!isMe && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon" aria-label={`Actions for ${member.displayName}`} />
                          }
                        >
                          <MoreHorizontal />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem
                            onClick={() => onChangeRole(member, member.role === "OWNER" ? "MEMBER" : "OWNER")}
                          >
                            <ShieldCheck />
                            {member.role === "OWNER" ? "Make member" : "Make owner"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => onRemove(member)}>
                            <UserMinus />
                            Remove from workspace
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function InvitationsTable({
  invitations,
  onRevoke,
  onInvite,
}: {
  invitations: readonly Invitation[];
  onRevoke: (invitation: Invitation) => void;
  onInvite: () => void;
}) {
  if (invitations.length === 0)
    return (
      <EmptyState
        icon={MailX}
        title="No pending invitations"
        description="Invitations you send appear here until they're accepted, revoked or expire."
        action={
          <Button variant="outline" size="sm" onClick={onInvite}>
            <UserPlus />
            Invite member
          </Button>
        }
      />
    );
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <table className="w-full text-body-sm">
        <caption className="sr-only">Pending invitations</caption>
        <thead>
          <tr className="border-b border-border text-left text-caption text-muted-foreground">
            <th scope="col" className="px-4 py-2.5 font-medium">
              Email
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              Role
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              Sent
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              Expires
            </th>
            <th scope="col" className="px-4 py-2.5">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {invitations.map((invitation) => (
            <tr key={invitation.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3 break-all text-foreground">{invitation.email}</td>
              <td className="px-4 py-3">{ROLE_LABEL[invitation.role]}</td>
              <td className="px-4 py-3 text-muted-foreground">{formatDate(invitation.createdAt)}</td>
              <td className="px-4 py-3 text-muted-foreground">{formatDate(invitation.expiresAt)}</td>
              <td className="px-4 py-3 text-right">
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`Revoke invitation for ${invitation.email}`}
                  onClick={() => onRevoke(invitation)}
                >
                  Revoke
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
