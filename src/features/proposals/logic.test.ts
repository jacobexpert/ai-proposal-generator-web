import { describe, expect, it } from "vitest";

import { deadlineUrgency, timeAgo, todayUtc } from "./format";
import { emptyProposalForm, proposalFormSchema, toCreateRequest, toUpdateRequest } from "./proposal-form";
import { parseSections, SPEC_DEFAULT_SECTIONS } from "./quick-template";
import { effectiveStatus, isTabAvailable, proposalHref } from "./status";

const ID = "bbbbbbbb-1111-4222-8333-444444444444";
const NOW = new Date("2026-09-27T10:00:00Z");

describe("status rules", () => {
  it("opens the screen matching the status (US-FE-05 AC3)", () => {
    expect(proposalHref(ID, "DRAFT")).toBe(`/proposals/${ID}`);
    expect(proposalHref(ID, "DOCUMENTS_UPLOADED")).toBe(`/proposals/${ID}/documents`);
    expect(proposalHref(ID, "REQUIREMENTS_REVIEW")).toBe(`/proposals/${ID}/requirements`);
    expect(proposalHref(ID, "GENERATING")).toBe(`/proposals/${ID}/proposal`);
    expect(proposalHref(ID, "APPROVAL_PENDING")).toBe(`/proposals/${ID}/review`);
    expect(proposalHref(ID, "EXPORTED")).toBe(`/proposals/${ID}/exports`);
    expect(proposalHref(ID, "FAILED")).toBe(`/proposals/${ID}`);
  });

  it("unlocks tabs as the proposal progresses; FAILED keeps the step it failed at (US-FE-07 AC5)", () => {
    expect(isTabAvailable("documents", "DRAFT")).toBe(true);
    expect(isTabAvailable("requirements", "DOCUMENTS_UPLOADED")).toBe(false);
    expect(isTabAvailable("requirements", "ANALYZING")).toBe(true);
    expect(isTabAvailable("exports", "APPROVAL_PENDING")).toBe(false);
    expect(isTabAvailable("exports", "APPROVED")).toBe(true);
    expect(isTabAvailable("review", "FAILED", "GENERATING")).toBe(false);
    expect(isTabAvailable("proposal", "FAILED", "GENERATING")).toBe(true);
    expect(effectiveStatus("FAILED", null)).toBe("DRAFT");
  });
});

describe("deadlines and times", () => {
  it("flags deadlines within 3 days and overdue ones, only while work is open (US-FE-05 AC5)", () => {
    expect(deadlineUrgency("2026-09-27", false, NOW)).toEqual({ level: "soon", label: "Due today" });
    expect(deadlineUrgency("2026-09-28", false, NOW)).toEqual({ level: "soon", label: "Due tomorrow" });
    expect(deadlineUrgency("2026-09-30", false, NOW)).toEqual({ level: "soon", label: "Due in 3 days" });
    expect(deadlineUrgency("2026-10-01", false, NOW)).toBeNull();
    expect(deadlineUrgency("2026-09-20", false, NOW)).toEqual({ level: "overdue", label: "Overdue" });
    expect(deadlineUrgency("2026-09-28", true, NOW)).toBeNull();
  });

  it("formats relative times", () => {
    expect(timeAgo("2026-09-27T09:59:30Z", NOW)).toBe("just now");
    expect(timeAgo("2026-09-27T07:00:00Z", NOW)).toBe("3 hours ago");
    expect(timeAgo("2026-09-26T10:00:00Z", NOW)).toBe("yesterday");
    expect(timeAgo("nope", NOW)).toBe("—");
  });
});

describe("quick template sections", () => {
  it("parses one section per line with valid unique keys and * for user input", () => {
    const sections = parseSections(
      "Executive Summary\n\nTổng quan dự án\nExecutive Summary\nCommercial Overview *\n !!! ",
    );
    expect(sections).toEqual([
      { key: "executive-summary", title: "Executive Summary", requiresUserInput: false },
      { key: "tong-quan-du-an", title: "Tổng quan dự án", requiresUserInput: false },
      { key: "executive-summary-2", title: "Executive Summary", requiresUserInput: false },
      { key: "commercial-overview", title: "Commercial Overview", requiresUserInput: true },
      { key: "section-5", title: "!!!", requiresUserInput: false },
    ]);
    for (const s of sections) expect(s.key).toMatch(/^[a-z0-9][a-z0-9_-]{0,99}$/);
  });

  it("prefills the spec §11 structure (22 sections)", () => {
    expect(parseSections(SPEC_DEFAULT_SECTIONS.join("\n"))).toHaveLength(22);
  });
});

describe("proposal form", () => {
  const valid = {
    ...emptyProposalForm(),
    name: "Core banking",
    customerName: "Contoso",
    customerIndustry: "Banking",
    opportunityDescription: "Azure move",
    deadline: "2999-01-01",
    templateId: "aaaaaaaa-1111-4222-8333-444444444444",
  };

  it("validates like CreateProposalRequest", () => {
    expect(proposalFormSchema().safeParse(valid).success).toBe(true);
    const bad = proposalFormSchema().safeParse({
      ...valid,
      name: " ",
      deadline: "2000-01-01",
      customerWebsite: "contoso.com",
      opportunityValue: "-1",
    });
    expect(bad.success).toBe(false);
    const fields = bad.error!.issues.map((i) => i.path[0]);
    expect(fields).toEqual(expect.arrayContaining(["name", "deadline", "customerWebsite", "opportunityValue"]));
    // An existing past deadline may be kept when editing (only new deadlines must be today or later).
    expect(proposalFormSchema("2000-01-01").safeParse({ ...valid, deadline: "2000-01-01" }).success).toBe(true);
    expect(todayUtc(NOW)).toBe("2026-09-27");
  });

  it("creates without empty optional fields", () => {
    expect(toCreateRequest({ ...valid, salesOwner: "", opportunityValue: "1500.5" })).toEqual({
      name: "Core banking",
      customerName: "Contoso",
      customerIndustry: "Banking",
      opportunityDescription: "Azure move",
      deadline: "2999-01-01",
      language: "en",
      currency: "USD",
      templateId: valid.templateId,
      opportunityValue: 1500.5,
    });
  });

  it("updates only what changed; clearing an optional text sends an empty string", () => {
    const before = { ...valid, salesOwner: "Ann" };
    expect(toUpdateRequest(before, before)).toBeNull();
    expect(toUpdateRequest({ ...before, name: "New name", salesOwner: "" }, before)).toEqual({
      name: "New name",
      salesOwner: "",
    });
  });
});
