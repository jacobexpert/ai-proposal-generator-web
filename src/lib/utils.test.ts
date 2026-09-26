import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("keeps design-system font sizes next to text colours", () => {
    expect(cn("text-caption text-info")).toBe("text-caption text-info");
    expect(cn("text-body-sm", "text-primary-foreground")).toBe("text-body-sm text-primary-foreground");
  });

  it("still resolves conflicting utilities", () => {
    expect(cn("text-caption", "text-body-sm")).toBe("text-body-sm");
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
