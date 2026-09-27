"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { z } from "zod";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import type { Proposal, ProposalFields, TemplateSummary } from "./api";
import { todayUtc } from "./format";

export const LANGUAGES = [
  ["en", "English"],
  ["vi", "Vietnamese"],
  ["ja", "Japanese"],
  ["ko", "Korean"],
  ["zh", "Chinese"],
  ["fr", "French"],
  ["de", "German"],
  ["es", "Spanish"],
] as const;
export const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "VND", "SGD", "AUD", "CAD", "CHF", "CNY", "KRW", "INR"] as const;

const required = (label: string, max: number) =>
  z.string().trim().min(1, `Enter ${label}.`).max(max, `Use at most ${max} characters.`);
const optional = (max: number) => z.string().trim().max(max, `Use at most ${max} characters.`);

/**
 * Proposal metadata (FR-03), mirroring CreateProposalRequest. All values are strings in the form;
 * `toCreateRequest` / `toUpdateRequest` convert them. `keepDeadline` lets an edit keep an
 * existing deadline that is now in the past (only new deadlines must be today or later, D5).
 */
export function proposalFormSchema(keepDeadline?: string) {
  return z.object({
    name: required("a proposal name", 200),
    customerName: required("the customer name", 200),
    customerIndustry: required("the customer's industry", 100),
    opportunityDescription: required("a short description of the opportunity", 10000),
    deadline: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a deadline.")
      .refine((d) => d === keepDeadline || d >= todayUtc(), "The deadline can't be in the past."),
    language: z.string().regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/, "Choose a language."),
    currency: z.string().regex(/^[A-Z]{3}$/, "Choose a currency."),
    templateId: z.guid("Choose a template."),
    customerWebsite: optional(500).refine(
      (v) => v === "" || /^https?:\/\/\S{1,490}$/.test(v),
      "Enter a full web address starting with https://",
    ),
    accountManager: optional(200),
    solutionArchitect: optional(200),
    salesOwner: optional(200),
    opportunityValue: z
      .string()
      .trim()
      .refine((v) => v === "" || (Number.isFinite(Number(v)) && Number(v) >= 0), "Enter an amount of 0 or more."),
    internalNotes: optional(10000),
  });
}
export type ProposalFormValues = z.infer<ReturnType<typeof proposalFormSchema>>;

export const OPTIONAL_TEXT = [
  "customerWebsite",
  "accountManager",
  "solutionArchitect",
  "salesOwner",
  "internalNotes",
] as const;

export function emptyProposalForm(): ProposalFormValues {
  return {
    name: "",
    customerName: "",
    customerIndustry: "",
    opportunityDescription: "",
    deadline: "",
    language: "en",
    currency: "USD",
    templateId: "",
    customerWebsite: "",
    accountManager: "",
    solutionArchitect: "",
    salesOwner: "",
    opportunityValue: "",
    internalNotes: "",
  };
}

export function formFromProposal(p: Proposal): ProposalFormValues {
  return {
    name: p.name,
    customerName: p.customerName,
    customerIndustry: p.customerIndustry,
    opportunityDescription: p.opportunityDescription,
    deadline: p.deadline,
    language: p.language,
    currency: p.currency.toUpperCase(),
    templateId: p.templateId,
    customerWebsite: p.customerWebsite ?? "",
    accountManager: p.accountManager ?? "",
    solutionArchitect: p.solutionArchitect ?? "",
    salesOwner: p.salesOwner ?? "",
    opportunityValue: p.opportunityValue == null ? "" : String(p.opportunityValue),
    internalNotes: p.internalNotes ?? "",
  };
}

/** POST body: optional fields left empty are simply not sent. */
export function toCreateRequest(v: ProposalFormValues): ProposalFields {
  const body: ProposalFields = {
    name: v.name,
    customerName: v.customerName,
    customerIndustry: v.customerIndustry,
    opportunityDescription: v.opportunityDescription,
    deadline: v.deadline,
    language: v.language,
    currency: v.currency,
    templateId: v.templateId,
  };
  for (const key of OPTIONAL_TEXT) if (v[key]) body[key] = v[key];
  if (v.opportunityValue !== "") body.opportunityValue = Number(v.opportunityValue);
  return body;
}

/**
 * PATCH body: only what changed (spec: absent = unchanged; "" on an optional text = cleared).
 * Returns null when nothing changed.
 */
export function toUpdateRequest(v: ProposalFormValues, before: ProposalFormValues): Partial<ProposalFields> | null {
  const body: Partial<ProposalFields> = {};
  const next = toCreateRequest(v);
  for (const key of Object.keys(v) as (keyof ProposalFormValues)[]) {
    if (v[key] === before[key]) continue;
    if (key === "opportunityValue") {
      if (v.opportunityValue !== "") body.opportunityValue = Number(v.opportunityValue);
      continue; // the API cannot clear a number (null = unchanged)
    }
    (body as Record<string, unknown>)[key] = (OPTIONAL_TEXT as readonly string[]).includes(key) ? v[key] : next[key];
  }
  return Object.keys(body).length ? body : null;
}

type FieldName = keyof ProposalFormValues;

function Field({
  name,
  label,
  optional: isOptional,
  hint,
  errors,
  className,
  children,
}: {
  name: FieldName;
  label: string;
  optional?: boolean;
  hint?: string;
  errors: FieldErrors<ProposalFormValues>;
  className?: string;
  children: (aria: { id: string; "aria-invalid"?: true; "aria-describedby"?: string }) => React.ReactNode;
}) {
  const id = `proposal-${name}`;
  const error = errors[name]?.message;
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {isOptional && <span className="font-normal text-muted-foreground"> (optional)</span>}
      </Label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {hint && (
        <p id={`${id}-hint`} className="text-caption text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-body-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** The metadata fields, shared by the wizard's step 1 (US-FE-06) and the edit dialog (US-FE-07). */
export function ProposalFormFields({
  register,
  errors,
  templates,
  templateSlot,
  currentLanguage,
  currentCurrency,
}: {
  register: UseFormRegister<ProposalFormValues>;
  errors: FieldErrors<ProposalFormValues>;
  templates: readonly TemplateSummary[];
  /** Replaces the template select (e.g. "create a template" when there are none). */
  templateSlot?: React.ReactNode;
  currentLanguage?: string;
  currentCurrency?: string;
}) {
  const languages: readonly (readonly [string, string])[] =
    currentLanguage && !LANGUAGES.some(([code]) => code === currentLanguage)
      ? [...LANGUAGES, [currentLanguage, currentLanguage]]
      : LANGUAGES;
  const currencies: readonly string[] =
    currentCurrency && !(CURRENCIES as readonly string[]).includes(currentCurrency)
      ? [...CURRENCIES, currentCurrency]
      : CURRENCIES;

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-3 text-panel-title font-semibold text-foreground">Opportunity</legend>
        <Field name="name" label="Proposal name" errors={errors} className="sm:col-span-2">
          {(aria) => <Input maxLength={200} {...aria} {...register("name")} />}
        </Field>
        <Field name="customerName" label="Customer name" errors={errors}>
          {(aria) => <Input maxLength={200} autoComplete="organization" {...aria} {...register("customerName")} />}
        </Field>
        <Field name="customerIndustry" label="Customer industry" errors={errors}>
          {(aria) => <Input maxLength={100} placeholder="e.g. Banking" {...aria} {...register("customerIndustry")} />}
        </Field>
        <Field
          name="opportunityDescription"
          label="Opportunity description"
          hint="What the customer needs and why. The AI uses this as context — it is not sent to the customer."
          errors={errors}
          className="sm:col-span-2"
        >
          {(aria) => <Textarea rows={4} maxLength={10000} {...aria} {...register("opportunityDescription")} />}
        </Field>
        <Field name="deadline" label="Deadline" hint="Submission date (UTC)." errors={errors}>
          {(aria) => <Input type="date" min={todayUtc()} {...aria} {...register("deadline")} />}
        </Field>
        <Field name="templateId" label="Template" errors={errors}>
          {(aria) =>
            templateSlot ?? (
              <NativeSelect {...aria} {...register("templateId")}>
                <option value="">Choose a template…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.sectionCount != null ? `${t.name} (${t.sectionCount} sections)` : t.name}
                  </option>
                ))}
              </NativeSelect>
            )
          }
        </Field>
        <Field name="language" label="Proposal language" errors={errors}>
          {(aria) => (
            <NativeSelect {...aria} {...register("language")}>
              {languages.map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
        <Field name="currency" label="Currency" errors={errors}>
          {(aria) => (
            <NativeSelect {...aria} {...register("currency")}>
              {currencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
      </fieldset>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-3 text-panel-title font-semibold text-foreground">People &amp; details</legend>
        <Field name="customerWebsite" label="Customer website" optional errors={errors}>
          {(aria) => (
            <Input type="url" maxLength={500} placeholder="https://" {...aria} {...register("customerWebsite")} />
          )}
        </Field>
        <Field name="opportunityValue" label="Opportunity value" optional errors={errors}>
          {(aria) => (
            <Input type="number" min={0} step="any" inputMode="decimal" {...aria} {...register("opportunityValue")} />
          )}
        </Field>
        <Field name="accountManager" label="Account manager" optional errors={errors}>
          {(aria) => <Input maxLength={200} {...aria} {...register("accountManager")} />}
        </Field>
        <Field name="solutionArchitect" label="Solution architect" optional errors={errors}>
          {(aria) => <Input maxLength={200} {...aria} {...register("solutionArchitect")} />}
        </Field>
        <Field name="salesOwner" label="Sales owner" optional errors={errors}>
          {(aria) => <Input maxLength={200} {...aria} {...register("salesOwner")} />}
        </Field>
        <Field
          name="internalNotes"
          label="Internal notes"
          optional
          hint="For your team only."
          errors={errors}
          className="sm:col-span-2"
        >
          {(aria) => <Textarea rows={3} maxLength={10000} {...aria} {...register("internalNotes")} />}
        </Field>
      </fieldset>
    </div>
  );
}

/** The fields a form sends back from the API's 400 `errors[]`. */
export const PROPOSAL_FIELDS = Object.keys(emptyProposalForm()) as (keyof ProposalFormValues)[];
