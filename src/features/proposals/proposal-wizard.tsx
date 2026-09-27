"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  FileStack,
  LoaderCircle,
  Plus,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCurrentWorkspace } from "@/features/workspaces";
import { applyFieldErrors, describeApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

import { createProposal, updateProposal, type Proposal } from "./api";
import { formatDeadline } from "./format";
import {
  emptyProposalForm,
  formFromProposal,
  LANGUAGES,
  PROPOSAL_FIELDS,
  ProposalFormFields,
  proposalFormSchema,
  toCreateRequest,
  toUpdateRequest,
  type ProposalFormValues,
} from "./proposal-form";
import { proposalKey, proposalsKey, useProposal, useTemplate, useTemplates } from "./queries";
import { QuickTemplateDialog } from "./quick-template-dialog";
import { tabHref } from "./status";

const STEPS = ["Basic info", "Documents", "Company knowledge", "Template", "Review"] as const;

/** US-FE-06: create a proposal step by step. Everything after step 1 works on the saved proposal (AC4). */
export function ProposalWizard() {
  const workspace = useCurrentWorkspace();
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const proposalId = search.get("proposalId") ?? undefined;
  const rawStep = Number.parseInt(search.get("step") ?? "1", 10);
  const step = proposalId && rawStep >= 1 && rawStep <= STEPS.length ? rawStep : 1;
  const proposal = useProposal(workspace.id, proposalId);

  const go = (next: number, id: string | undefined = proposalId) => {
    const params = new URLSearchParams();
    if (id) params.set("proposalId", id);
    if (next > 1) params.set("step", String(next));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const header = (
    <PageHeader
      title="New proposal"
      description={proposal.data ? `${proposal.data.name} · ${proposal.data.customerName}` : "Set up the opportunity."}
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Proposals", href: "/proposals" },
        { label: "New proposal", href: "/proposals/new" },
      ]}
    />
  );

  if (proposalId && proposal.isPending)
    return (
      <>
        {header}
        <LoadingState label="Loading proposal" />
      </>
    );
  if (proposalId && proposal.isError)
    return (
      <>
        {header}
        <ErrorState error={proposal.error} onRetry={() => void proposal.refetch()} />
      </>
    );

  return (
    <>
      {header}
      <WizardStepper current={step} canJump={!!proposal.data} onJump={(n) => go(n)} />
      <div className="max-w-4xl rounded-xl border border-border bg-card p-6">
        {step === 1 && (
          <BasicInfoStep
            key={proposal.data?.version ?? "new"}
            workspaceId={workspace.id}
            canCreateTemplate={workspace.role === "OWNER"}
            proposal={proposal.data}
            onSaved={(saved) => go(2, saved.id)}
          />
        )}
        {step === 2 && (
          <DocumentsStep kind="customer" onBack={() => go(1)} onNext={() => go(3)} proposalId={proposalId!} />
        )}
        {step === 3 && (
          <DocumentsStep kind="company" onBack={() => go(2)} onNext={() => go(4)} proposalId={proposalId!} />
        )}
        {step === 4 && proposal.data && (
          <TemplateStep workspaceId={workspace.id} proposal={proposal.data} onBack={() => go(3)} onNext={() => go(5)} />
        )}
        {step === 5 && proposal.data && (
          <ReviewStep workspaceId={workspace.id} proposal={proposal.data} onBack={() => go(4)} onEdit={() => go(1)} />
        )}
      </div>
    </>
  );
}

function WizardStepper({
  current,
  canJump,
  onJump,
}: {
  current: number;
  canJump: boolean;
  onJump: (n: number) => void;
}) {
  return (
    <ol aria-label="Steps" className="mb-6 flex max-w-4xl flex-wrap gap-2">
      {STEPS.map((label, index) => {
        const n = index + 1;
        const state = n < current ? "done" : n === current ? "current" : "todo";
        const content = (
          <>
            <span
              aria-hidden="true"
              className={cn(
                "flex size-6 items-center justify-center rounded-full border text-caption font-semibold",
                state === "done" && "border-brand bg-brand text-brand-foreground",
                state === "current" && "border-brand text-brand-text",
                state === "todo" && "border-border text-muted-foreground",
              )}
            >
              {state === "done" ? <Check className="size-3.5" /> : n}
            </span>
            <span
              className={cn(
                state === "todo" ? "text-muted-foreground" : "text-foreground",
                state === "current" && "font-semibold",
              )}
            >
              {label}
            </span>
          </>
        );
        return (
          <li
            key={label}
            aria-current={state === "current" ? "step" : undefined}
            className="flex items-center gap-2 text-body-sm"
          >
            {canJump && state !== "current" ? (
              <button
                type="button"
                className="flex items-center gap-2 rounded-md hover:underline"
                onClick={() => onJump(n)}
              >
                {content}
                <span className="sr-only">(go to step {n})</span>
              </button>
            ) : (
              <span className="flex items-center gap-2">{content}</span>
            )}
            {n < STEPS.length && <span aria-hidden="true" className="mx-1 h-px w-6 bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}

/** AC2–AC4: required/optional fields; the proposal is created (or updated) when this step is saved. */
function BasicInfoStep({
  workspaceId,
  canCreateTemplate,
  proposal,
  onSaved,
}: {
  workspaceId: string;
  canCreateTemplate: boolean;
  proposal?: Proposal;
  onSaved: (proposal: Proposal) => void;
}) {
  const queryClient = useQueryClient();
  const templates = useTemplates(workspaceId);
  const before = proposal ? formFromProposal(proposal) : undefined;
  const [templateOpen, setTemplateOpen] = useState(false);
  const [formError, setFormError] = useState<{ message: string; traceId?: string } | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<ProposalFormValues>({
    resolver: zodResolver(proposalFormSchema(before?.deadline)),
    defaultValues: before ?? emptyProposalForm(),
  });

  const save = useMutation({
    mutationFn: async (values: ProposalFormValues) => {
      if (!proposal) return createProposal(workspaceId, toCreateRequest(values));
      const body = toUpdateRequest(values, before!);
      return body ? updateProposal(workspaceId, proposal.id, { ...body, version: proposal.version }) : proposal;
    },
    meta: { errorToast: false },
    onSuccess: (saved) => {
      queryClient.setQueryData(proposalKey(workspaceId, saved.id), saved);
      void queryClient.invalidateQueries({ queryKey: proposalsKey(workspaceId) });
      onSaved(saved);
    },
    onError: (error) => {
      const unmatched = applyFieldErrors(error, PROPOSAL_FIELDS, setError);
      const ui = describeApiError(error);
      if (ui.kind === "validation" && unmatched.length === 0) return;
      setFormError({ message: unmatched.join(" ") || `${ui.title}. ${ui.message}`, traceId: ui.traceId });
    },
  });

  const noTemplates = templates.isSuccess && templates.data.length === 0;
  const templateSlot = templates.isPending ? (
    <p className="flex h-control-app items-center text-body-sm text-muted-foreground">Loading templates…</p>
  ) : templates.isError ? (
    <p className="text-body-sm text-danger">
      Templates couldn&apos;t be loaded.{" "}
      <button type="button" className="underline" onClick={() => void templates.refetch()}>
        Try again
      </button>
    </p>
  ) : noTemplates ? (
    canCreateTemplate ? (
      <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-border p-3">
        <p className="text-body-sm text-muted-foreground">This workspace has no templates yet.</p>
        <Button type="button" variant="outline" size="sm" onClick={() => setTemplateOpen(true)}>
          <Plus />
          Create a template
        </Button>
      </div>
    ) : (
      <p className="rounded-lg border border-dashed border-border p-3 text-body-sm text-muted-foreground">
        This workspace has no templates yet. Ask a workspace owner to create one.
      </p>
    )
  ) : undefined;

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => {
        setFormError(null);
        save.mutate(values);
      })}
    >
      {formError && (
        <Alert tone="danger" className="mb-5">
          <AlertCircle aria-hidden="true" />
          <div>
            <p>{formError.message}</p>
            {formError.traceId && (
              <p className="mt-1 font-mono text-mono-sm opacity-80">Trace ID: {formError.traceId}</p>
            )}
          </div>
        </Alert>
      )}
      <ProposalFormFields
        register={register}
        errors={errors}
        templates={templates.data ?? []}
        templateSlot={templateSlot}
        currentLanguage={before?.language}
        currentCurrency={before?.currency}
      />
      <div className="mt-6 flex justify-end gap-2 border-t border-border pt-5">
        <Link href="/proposals" className={buttonVariants({ variant: "outline" })}>
          Cancel
        </Link>
        <Button type="submit" disabled={save.isPending || noTemplates}>
          {save.isPending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <ArrowRight />}
          {proposal ? "Save and continue" : "Create and continue"}
        </Button>
      </div>
      {canCreateTemplate && (
        <QuickTemplateDialog
          workspaceId={workspaceId}
          open={templateOpen}
          onOpenChange={setTemplateOpen}
          onCreated={(template) => setValue("templateId", template.id, { shouldValidate: true, shouldDirty: true })}
        />
      )}
    </form>
  );
}

/**
 * AC5: steps 2 and 3 embed FE 02's `DocumentUploader` (US-FE-08) with the right default category.
 * Until it ships, the step explains that documents can be added later and lets the user continue.
 */
function DocumentsStep({
  kind,
  proposalId,
  onBack,
  onNext,
}: {
  kind: "customer" | "company";
  proposalId: string;
  onBack: () => void;
  onNext: () => void;
}) {
  const customer = kind === "customer";
  return (
    <div>
      <h2 className="text-panel-title font-semibold text-foreground">
        {customer ? "Customer documents" : "Company knowledge"}
      </h2>
      <p className="mt-1 text-body-sm text-muted-foreground">
        {customer
          ? "The RFP, RFI, requirements and meeting notes from the customer."
          : "Your company profile, capabilities and references that the proposal may cite."}
      </p>
      <div className="mt-5">
        <EmptyState
          icon={customer ? FileStack : Building2}
          title="Document upload is coming soon"
          description={`Uploading is being built (US-FE-08). You can continue now and add ${
            customer ? "customer documents" : "company knowledge"
          } later from the proposal's Documents tab.`}
          action={
            <Link
              href={tabHref(proposalId, "documents")}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Open the Documents tab
            </Link>
          }
        />
      </div>
      <StepNav onBack={onBack} onNext={onNext} />
    </div>
  );
}

/** Step 4: the template's sections, and a chance to switch template. */
function TemplateStep({
  workspaceId,
  proposal,
  onBack,
  onNext,
}: {
  workspaceId: string;
  proposal: Proposal;
  onBack: () => void;
  onNext: () => void;
}) {
  const queryClient = useQueryClient();
  const templates = useTemplates(workspaceId);
  const [templateId, setTemplateId] = useState(proposal.templateId);
  const template = useTemplate(workspaceId, templateId);
  const save = useMutation({
    mutationFn: () => updateProposal(workspaceId, proposal.id, { templateId, version: proposal.version }),
    meta: { errorToast: false },
    onSuccess: (saved) => {
      queryClient.setQueryData(proposalKey(workspaceId, saved.id), saved);
      onNext();
    },
  });
  const ui = save.isError ? describeApiError(save.error) : undefined;

  return (
    <div>
      <h2 className="text-panel-title font-semibold text-foreground">Template</h2>
      <p className="mt-1 text-body-sm text-muted-foreground">The sections this proposal will be written in.</p>

      <div className="mt-5 flex max-w-md flex-col gap-1.5">
        <Label htmlFor="wizard-template">Template</Label>
        <NativeSelect id="wizard-template" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
          {(templates.data ?? []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
          {!templates.data?.some((t) => t.id === templateId) && <option value={templateId}>Current template</option>}
        </NativeSelect>
      </div>

      <div className="mt-5">
        {template.isPending ? (
          <LoadingState label="Loading sections" rows={3} />
        ) : template.isError ? (
          <ErrorState error={template.error} onRetry={() => void template.refetch()} />
        ) : (
          <ol className="grid gap-1.5 sm:grid-cols-2">
            {template.data.sections.map((section, index) => (
              <li
                key={section.key}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-body-sm"
              >
                <span className="w-6 text-right text-caption text-muted-foreground tabular-nums">{index + 1}.</span>
                <span className="min-w-0 flex-1 truncate text-foreground">{section.title}</span>
                {section.requiresUserInput && (
                  <span className="rounded-full bg-warning-subtle px-2 py-0.5 text-caption font-medium text-warning">
                    Input required
                  </span>
                )}
              </li>
            ))}
          </ol>
        )}
        {template.data?.sections.some((s) => s.requiresUserInput) && (
          <p className="mt-3 text-caption text-muted-foreground">
            “Input required” sections are never invented by the AI (for example prices) — you provide them.
          </p>
        )}
      </div>

      {ui && (
        <Alert tone="danger" className="mt-5">
          <AlertCircle aria-hidden="true" />
          <p>
            {ui.title}. {ui.message}
          </p>
        </Alert>
      )}
      <StepNav
        onBack={onBack}
        onNext={() => (templateId === proposal.templateId ? onNext() : save.mutate())}
        pending={save.isPending}
      />
    </div>
  );
}

/** Step 5 (AC6): summary and the next action — analysis, never a one-click "generate everything" (§46). */
function ReviewStep({
  workspaceId,
  proposal,
  onBack,
  onEdit,
}: {
  workspaceId: string;
  proposal: Proposal;
  onBack: () => void;
  onEdit: () => void;
}) {
  const template = useTemplate(workspaceId, proposal.templateId);
  const language = LANGUAGES.find(([code]) => code === proposal.language)?.[1] ?? proposal.language;
  const rows: [string, string][] = [
    ["Proposal", proposal.name],
    ["Customer", `${proposal.customerName} · ${proposal.customerIndustry}`],
    ["Deadline", formatDeadline(proposal.deadline)],
    ["Language · currency", `${language} · ${proposal.currency}`],
    ["Template", template.data ? `${template.data.name} (${template.data.sections.length} sections)` : "…"],
  ];
  return (
    <div>
      <h2 className="text-panel-title font-semibold text-foreground">Review</h2>
      <p className="mt-1 text-body-sm text-muted-foreground">
        The proposal is saved as a draft. Next, the AI analyzes the documents so you can review the extracted
        requirements before anything is written.
      </p>
      <dl className="mt-5 flex flex-col gap-3 text-body-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[11rem_1fr] gap-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="break-words text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      <button type="button" onClick={onEdit} className="mt-3 text-body-sm font-medium text-brand-text hover:underline">
        Edit basic info
      </button>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft />
          Back
        </Button>
        <div className="flex gap-2">
          <Link href={tabHref(proposal.id, "overview")} className={buttonVariants({ variant: "outline" })}>
            Open proposal
          </Link>
          <Tooltip>
            <TooltipTrigger render={<span tabIndex={0} aria-describedby="analyze-hint" className="inline-flex" />}>
              <Button type="button" disabled>
                <Sparkles />
                Analyze documents
              </Button>
            </TooltipTrigger>
            <TooltipContent>Available once document upload and analysis ship (US-FE-08, US-FE-10).</TooltipContent>
          </Tooltip>
          <span id="analyze-hint" className="sr-only">
            Available once document upload and analysis ship.
          </span>
        </div>
      </div>
    </div>
  );
}

function StepNav({ onBack, onNext, pending }: { onBack: () => void; onNext: () => void; pending?: boolean }) {
  return (
    <div className="mt-6 flex justify-between gap-2 border-t border-border pt-5">
      <Button type="button" variant="outline" onClick={onBack}>
        <ArrowLeft />
        Back
      </Button>
      <Button type="button" onClick={onNext} disabled={pending}>
        {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <ArrowRight />}
        Continue
      </Button>
    </div>
  );
}
