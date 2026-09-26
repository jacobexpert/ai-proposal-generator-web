"use client";

import { StatusBadge } from "@/components/ui/status-badge";

import { ROLE_LABEL } from "./role-label";
import { useWorkspaceContext } from "./workspace-context";

/** US-FE-03 AC1: read-only profile from `GET /api/me` (rendered inside <WorkspaceGate>). */
export function ProfileDetails() {
  const { user, workspace, workspaces } = useWorkspaceContext();
  if (!user) return null;

  return (
    <div className="grid max-w-3xl gap-6">
      <section aria-labelledby="account-heading" className="rounded-xl border border-border bg-card p-6">
        <h2 id="account-heading" className="text-panel-title font-semibold text-foreground">
          Account
        </h2>
        <dl className="mt-4 grid grid-cols-[10rem_1fr] gap-x-4 gap-y-3 text-body-sm">
          <dt className="text-muted-foreground">Name</dt>
          <dd className="text-foreground">{user.displayName}</dd>
          <dt className="text-muted-foreground">Email</dt>
          <dd className="text-foreground">{user.email}</dd>
        </dl>
      </section>

      <section aria-labelledby="workspaces-heading" className="rounded-xl border border-border bg-card p-6">
        <h2 id="workspaces-heading" className="text-panel-title font-semibold text-foreground">
          Workspaces
        </h2>
        <table className="mt-4 w-full text-body-sm">
          <thead>
            <tr className="border-b border-border text-left text-caption text-muted-foreground">
              <th scope="col" className="py-2 font-medium">
                Name
              </th>
              <th scope="col" className="py-2 font-medium">
                Role
              </th>
              <th scope="col" className="py-2 font-medium">
                <span className="sr-only">Status</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {workspaces.map((w) => (
              <tr key={w.id} className="h-row border-b border-border last:border-0">
                <td className="text-foreground">{w.name}</td>
                <td className="text-muted-foreground">{ROLE_LABEL[w.role]}</td>
                <td className="text-right">
                  {w.id === workspace?.id && <StatusBadge tone="info">Current</StatusBadge>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
