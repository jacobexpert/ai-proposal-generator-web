import { readdirSync, readFileSync, statSync } from "node:fs";
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

  it("defines a Tailwind colour for every design-system colour class used in src", () => {
    // A class like `text-danger-foreground` silently does nothing when `--color-danger-foreground`
    // is missing from @theme (that is how destructive buttons lost their white text).
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) files.push(path);
      }
    };
    walk(join(process.cwd(), "src"));
    const used = new Set<string>();
    const pattern =
      /(?:^|[\s"'`:])!?(?:bg|text|border|ring|outline|fill|stroke|from|to|via|accent|decoration)-((?:brand|danger|success|warning|info|claim)(?:-[a-z]+)*)(?:\/\d+)?(?=[\s"'`]|$)/g;
    for (const file of files) {
      for (const match of readFileSync(file, "utf8").matchAll(pattern)) used.add(match[1]!);
    }
    expect(used.size).toBeGreaterThan(5);
    const missing = [...used].filter((name) => !css.includes(`--color-${name}:`));
    expect(missing).toEqual([]);
  });
});
