"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { notifySuccess } from "@/components/feedback/notify";
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
import { Textarea } from "@/components/ui/textarea";
import { applyFieldErrors, describeApiError } from "@/lib/api/errors";

import { createTemplate, type Template } from "./api";
import { templatesKey } from "./queries";
import { parseSections, SPEC_DEFAULT_SECTIONS } from "./quick-template";

const schema = z.object({
  name: z.string().trim().min(1, "Enter a template name.").max(200, "Use at most 200 characters."),
  sections: z.string().superRefine((text, ctx) => {
    const sections = parseSections(text);
    if (sections.length === 0) ctx.addIssue({ code: "custom", message: "Add at least one section." });
    if (sections.length > 50) ctx.addIssue({ code: "custom", message: "Use at most 50 sections." });
    const long = sections.find((s) => s.title.length > 200);
    if (long) ctx.addIssue({ code: "custom", message: `“${long.title.slice(0, 40)}…” is longer than 200 characters.` });
  }),
});
type Values = z.infer<typeof schema>;

/**
 * Minimal template creation for OWNERs when a workspace has none (decision 2026-09-27): the API
 * seeds nothing and a proposal needs a template. The full template builder is US-FE-27.
 */
export function QuickTemplateDialog({
  workspaceId,
  open,
  onOpenChange,
  onCreated,
}: {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (template: Template) => void;
}) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<{ message: string; traceId?: string } | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "Standard IT proposal", sections: SPEC_DEFAULT_SECTIONS.join("\n") },
  });
  const count = parseSections(useWatch({ control, name: "sections" })).length;

  const create = useMutation({
    mutationFn: (values: Values) =>
      createTemplate(workspaceId, { name: values.name, sections: parseSections(values.sections) }),
    meta: { errorToast: false },
    onSuccess: (template) => {
      void queryClient.invalidateQueries({ queryKey: templatesKey(workspaceId) });
      notifySuccess(`Template “${template.name}” created.`);
      onCreated(template);
      onOpenChange(false);
    },
    onError: (error) => {
      const unmatched = applyFieldErrors(error, ["name"] as const, setError);
      const ui = describeApiError(error);
      setFormError({ message: unmatched.join(" ") || `${ui.title}. ${ui.message}`, traceId: ui.traceId });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(next) => !create.isPending && onOpenChange(next)}>
      <DialogContent className="max-w-lg">
        <form
          noValidate
          onSubmit={handleSubmit((values) => {
            setFormError(null);
            create.mutate(values);
          })}
        >
          <DialogTitle>Create a template</DialogTitle>
          <DialogDescription>
            The sections every proposal in this workspace starts from. Prefilled with the recommended structure — edit
            it freely.
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
              <Label htmlFor="template-name">Name</Label>
              <Input
                id="template-name"
                maxLength={200}
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? "template-name-error" : undefined}
                {...register("name")}
              />
              {errors.name && (
                <p id="template-name-error" className="text-body-sm text-danger">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="template-sections">Sections</Label>
              <Textarea
                id="template-sections"
                rows={10}
                className="font-mono text-mono-sm"
                aria-invalid={errors.sections ? true : undefined}
                aria-describedby={`template-sections-hint${errors.sections ? " template-sections-error" : ""}`}
                {...register("sections")}
              />
              <p id="template-sections-hint" className="flex justify-between gap-3 text-caption text-muted-foreground">
                <span>
                  One section per line, in order. End a line with * when people must fill it in (e.g. prices).
                </span>
                <span className="tabular-nums">{count}/50</span>
              </p>
              {errors.sections && (
                <p id="template-sections-error" className="text-body-sm text-danger">
                  {errors.sections.message}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={create.isPending} />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
              Create template
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
