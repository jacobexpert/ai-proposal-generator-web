"use client";

import { ChevronLeft, ChevronRight, FilePlus2, FileText, Search, SearchX } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { StatusBadge } from "@/components/ui/status-badge";
import { useCurrentWorkspace } from "@/features/workspaces";
import { cn } from "@/lib/utils";

import type { ProposalListParams, ProposalSummary } from "./api";
import { deadlineUrgency, formatDeadline, timeAgo } from "./format";
import { useProposals } from "./queries";
import { PROPOSAL_STATUSES, proposalHref, RUNNING, STATUS_LABEL, STATUS_TONE, type ProposalStatus } from "./status";

const PAGE_SIZE = 20;
const SORTS = {
  updated: { sort: "updatedAt", direction: "desc", label: "Recently updated" },
  deadline: { sort: "deadline", direction: "asc", label: "Deadline (soonest first)" },
} as const;
type SortKey = keyof typeof SORTS;
const DONE: ReadonlySet<ProposalStatus> = new Set(["APPROVED", "EXPORTED"]);

/** URL state (shareable, survives reload): `?q=&status=&sort=&page=` (page is 1-based). */
function readParams(search: URLSearchParams) {
  const status = search.get("status");
  const sort = search.get("sort");
  const page = Number.parseInt(search.get("page") ?? "1", 10);
  return {
    q: (search.get("q") ?? "").slice(0, 200),
    status: PROPOSAL_STATUSES.includes(status as ProposalStatus) ? (status as ProposalStatus) : undefined,
    sort: (sort && sort in SORTS ? sort : "updated") as SortKey,
    page: Number.isFinite(page) && page >= 1 ? page : 1,
  };
}

/** US-FE-05: the workspace's proposals with search, status filter, sort and pagination. */
export function ProposalList({ title, description }: { title: string; description?: string }) {
  const workspace = useCurrentWorkspace();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const state = readParams(search);
  const [query, setQuery] = useState(state.q);
  // Follow the URL when it changes from outside (back/forward, a link), but not when the change
  // is our own debounced write — the user may have typed more since.
  const [urlQ, setUrlQ] = useState(state.q);
  const [sentQ, setSentQ] = useState(state.q);
  if (state.q !== urlQ) {
    setUrlQ(state.q);
    if (state.q !== sentQ) {
      setSentQ(state.q);
      setQuery(state.q);
    }
  }

  const update = (changes: Partial<Record<"q" | "status" | "sort" | "page", string | undefined>>) => {
    const next = new URLSearchParams(search.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!("page" in changes)) next.delete("page"); // a new filter starts on page 1
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Debounced search → URL.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === state.q) return;
    const timer = setTimeout(() => {
      setSentQ(trimmed);
      const next = new URLSearchParams(search.toString());
      if (trimmed) next.set("q", trimmed);
      else next.delete("q");
      next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 300);
    return () => clearTimeout(timer);
  }, [query, state.q, search, pathname, router]);

  const params: ProposalListParams = {
    q: state.q || undefined,
    status: state.status,
    page: state.page - 1,
    size: PAGE_SIZE,
    sort: SORTS[state.sort].sort,
    direction: SORTS[state.sort].direction,
  };
  const proposals = useProposals(workspace.id, params);
  const filtered = !!(state.q || state.status);

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <Link href="/proposals/new" className={buttonVariants()}>
            <FilePlus2 />
            New proposal
          </Link>
        }
      />

      <div role="search" className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-64 flex-1">
          <Search
            aria-hidden="true"
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            aria-label="Search by proposal or customer name"
            placeholder="Search proposals or customers"
            className="pl-9"
            maxLength={200}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="w-52">
          <NativeSelect
            aria-label="Filter by status"
            value={state.status ?? ""}
            onChange={(e) => update({ status: e.target.value || undefined })}
          >
            <option value="">All statuses</option>
            {PROPOSAL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="w-56">
          <NativeSelect
            aria-label="Sort"
            value={state.sort}
            onChange={(e) => update({ sort: e.target.value === "updated" ? undefined : e.target.value })}
          >
            {Object.entries(SORTS).map(([key, s]) => (
              <option key={key} value={key}>
                {s.label}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      {proposals.isPending ? (
        <LoadingState label="Loading proposals" />
      ) : proposals.isError ? (
        <ErrorState error={proposals.error} onRetry={() => void proposals.refetch()} />
      ) : proposals.data.items.length === 0 ? (
        filtered ? (
          <EmptyState
            icon={SearchX}
            title="No proposals match"
            description="Try another search or status."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setSentQ("");
                  router.replace(pathname, { scroll: false });
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={FileText}
            title="Create your first proposal"
            description="Start with the customer and opportunity, then add the RFP and supporting documents."
            action={
              <Link href="/proposals/new" className={buttonVariants({ size: "sm" })}>
                <FilePlus2 />
                New proposal
              </Link>
            }
          />
        )
      ) : (
        <>
          <ProposalTable items={proposals.data.items} stale={proposals.isPlaceholderData} />
          <Pagination
            page={state.page}
            totalPages={proposals.data.totalPages}
            total={proposals.data.totalElements}
            onPage={(page) => update({ page: page > 1 ? String(page) : undefined })}
          />
        </>
      )}
    </>
  );
}

function ProposalTable({ items, stale }: { items: readonly ProposalSummary[]; stale: boolean }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card transition-opacity",
        stale && "opacity-60",
      )}
      aria-busy={stale || undefined}
    >
      <table className="w-full text-body-sm">
        <caption className="sr-only">Proposals</caption>
        <thead>
          <tr className="border-b border-border text-left text-caption text-muted-foreground">
            <th scope="col" className="px-4 py-2.5 font-medium">
              Proposal
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              Status
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              Deadline
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              Updated
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => {
            const urgency = deadlineUrgency(p.deadline, DONE.has(p.status));
            return (
              <tr
                key={p.id}
                className="relative border-b border-border transition-colors last:border-0 hover:bg-muted/60"
              >
                <td className="px-4 py-3">
                  {/* Stretched link: the whole row opens the proposal, but only one tab stop per row. */}
                  <Link
                    href={proposalHref(p.id, p.status)}
                    className="font-medium text-foreground after:absolute after:inset-0 hover:underline"
                  >
                    {p.name}
                  </Link>
                  <p className="text-caption text-muted-foreground">{p.customerName}</p>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge tone={STATUS_TONE[p.status]} pulse={RUNNING.has(p.status)}>
                    {STATUS_LABEL[p.status]}
                  </StatusBadge>
                </td>
                <td className="px-4 py-3">
                  <span className="text-foreground">{formatDeadline(p.deadline)}</span>
                  {urgency && (
                    <span
                      className={cn(
                        "ml-2 rounded-full px-2 py-0.5 text-caption font-medium",
                        urgency.level === "overdue" ? "bg-danger-subtle text-danger" : "bg-warning-subtle text-warning",
                      )}
                    >
                      {urgency.label}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  <time dateTime={p.updatedAt} title={new Date(p.updatedAt).toLocaleString("en")}>
                    {timeAgo(p.updatedAt)}
                  </time>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) {
    return (
      <p className="mt-3 text-caption text-muted-foreground">{total === 1 ? "1 proposal" : `${total} proposals`}</p>
    );
  }
  return (
    <nav aria-label="Pagination" className="mt-3 flex items-center justify-between">
      <p className="text-caption text-muted-foreground">
        Page {page} of {totalPages} · {total} proposals
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft />
          Previous
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Next
          <ChevronRight />
        </Button>
      </div>
    </nav>
  );
}
