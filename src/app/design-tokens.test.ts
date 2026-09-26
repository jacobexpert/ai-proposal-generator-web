import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Guard against `shadcn init` / theme presets overwriting design-system tokens
 * (that is how the active sidebar item once became unreadable: grey text on a grey wash).
 */
const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
const rootBlock = css.slice(css.indexOf(":root {"), css.indexOf("@theme inline"));

function rootVar(name: string): string | undefined {
  return new RegExp(`--${name}:\\s*([^;]+);`).exec(rootBlock)?.[1]?.trim();
}

describe("design tokens in globals.css", () => {
  it.each([
    ["background", "#fafafa"],
    ["foreground", "#0f172a"],
    ["muted", "#f1f5f9"],
    ["muted-foreground", "#64748b"],
    ["card", "#ffffff"],
    ["border", "#e2e8f0"],
    ["brand", "#0052ff"],
    ["brand-foreground", "#ffffff"],
  ])("keeps DS value for --%s", (name, value) => {
    expect(rootVar(name)).toBe(value);
  });

  it.each([
    ["primary", "var(--brand)"],
    ["accent", "var(--brand-subtle)"],
    ["ring", "var(--brand)"],
    ["destructive", "var(--danger)"],
    ["popover", "var(--card)"],
  ])("maps shadcn --%s to the design system", (name, value) => {
    expect(rootVar(name)).toBe(value);
  });

  it("uses only design-system fonts", () => {
    expect(css).toContain('--font-sans: "Inter Variable"');
    expect(css).toContain('--font-heading: "Calistoga"');
    expect(css).not.toMatch(/oklch\(/);
  });
});
