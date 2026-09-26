import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import AppError from "@/app/(app)/error";
import NotFound from "@/app/not-found";

describe("AppError boundary", () => {
  it("hides the error message, shows the digest and retries", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const retry = vi.fn();
    const error = Object.assign(new Error("secret internal detail"), { digest: "abc123" });
    render(<AppError error={error} retry={retry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Reference: abc123");
    expect(screen.queryByText(/secret internal detail/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(retry).toHaveBeenCalledOnce();
  });
});

describe("NotFound page", () => {
  it("uses the neutral not-found-or-no-access wording", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { name: "Not found or you don't have access" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to dashboard/i })).toHaveAttribute("href", "/");
  });
});
