/** Default structure from the product spec §11 ("Recommended default structure"). `*` = needs user input. */
export const SPEC_DEFAULT_SECTIONS = [
  "Cover Page",
  "Executive Summary",
  "Customer Context & Objectives",
  "Understanding of Requirements",
  "Proposed Solution",
  "Solution Architecture",
  "Functional Scope",
  "Non-Functional Requirements",
  "Technical Approach",
  "Security",
  "Integration",
  "Data & Migration",
  "Implementation Approach",
  "Project Timeline",
  "Team & Responsibilities",
  "Deliverables",
  "Testing & Quality Assurance",
  "Operations & Support",
  "Risks & Mitigations",
  "Assumptions & Dependencies",
  "Commercial Overview *",
  "Next Steps",
];

export interface TemplateSectionDraft {
  key: string;
  title: string;
  requiresUserInput: boolean;
}

/** A key matching `^[a-z0-9][a-z0-9_-]{0,99}$` (spec US-BE-14), unique within the template. */
export function sectionKey(title: string, taken: Set<string>, index: number): string {
  const base =
    title
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/gi, "d")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 90) || `section-${index + 1}`;
  let key = base;
  for (let n = 2; taken.has(key); n += 1) key = `${base}-${n}`;
  taken.add(key);
  return key;
}

/** One section per line; a trailing `*` marks a section the user must fill in (e.g. prices). */
export function parseSections(text: string): TemplateSectionDraft[] {
  const taken = new Set<string>();
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const requiresUserInput = /\s*\*$/.test(line);
      const title = line.replace(/\s*\*$/, "").trim();
      return { key: sectionKey(title, taken, index), title, requiresUserInput };
    });
}
