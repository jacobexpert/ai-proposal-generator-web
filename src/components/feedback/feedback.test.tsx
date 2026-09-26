import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { ApiError, NetworkError } from "@/lib/api/client";

const problem = (status: number, extra: Record<string, unknown> = {}) =>
  new ApiError(status, { status, title: "x", traceId: "trace-123", ...extra });

describe("LoadingState", () => {
  it("announces a busy status with its label", () => {
    render(<LoadingState label="Loading proposals" />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status).toHaveTextContent("Loading proposals");
  });
});

describe("EmptyState", () => {
  it("renders title, description and action", () => {
    render(<EmptyState title="No proposals yet" description="Create one to start." action={<button>New</button>} />);
    expect(screen.getByText("No proposals yet")).toBeInTheDocument();
    expect(screen.getByText("Create one to start.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New" })).toBeInTheDocument();
  });
});

describe("ErrorState", () => {
  it("shows server error with trace id and a working retry", async () => {
    const onRetry = vi.fn();
    render(<ErrorState error={problem(500)} onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Trace ID: trace-123");
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it.each([403, 404])("treats %s as not found with a dashboard link and no retry", (status) => {
    render(<ErrorState error={problem(status)} onRetry={vi.fn()} />);
    expect(screen.getByText("Not found or you don't have access")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to dashboard/i })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
  });

  it("offers retry for network errors", () => {
    render(<ErrorState error={new NetworkError(new TypeError("fetch failed"))} onRetry={vi.fn()} />);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("never renders a raw 5xx detail", () => {
    render(<ErrorState error={problem(500, { detail: "NullPointerException at com.x.Y" })} />);
    expect(screen.queryByText(/NullPointerException/)).not.toBeInTheDocument();
  });
});

function Harness({ onConfirm, tone }: { onConfirm: () => unknown; tone?: "default" | "destructive" }) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <span data-testid="open">{String(open)}</span>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete document?"
        description="This cannot be undone."
        confirmLabel="Delete"
        tone={tone}
        onConfirm={onConfirm}
      />
    </>
  );
}

describe("ConfirmDialog", () => {
  it("closes after a successful confirm", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<Harness onConfirm={onConfirm} tone="destructive" />);
    expect(screen.getByRole("alertdialog")).toHaveTextContent("This cannot be undone.");
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.getByTestId("open")).toHaveTextContent("false"));
  });

  it("stays open and disabled while pending", async () => {
    let resolve!: () => void;
    const onConfirm = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    render(<Harness onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    await userEvent.keyboard("{Escape}");
    expect(screen.getByTestId("open")).toHaveTextContent("true");
    resolve();
    await waitFor(() => expect(screen.getByTestId("open")).toHaveTextContent("false"));
  });

  it("shows the error inline and stays open when confirm fails", async () => {
    const onConfirm = vi.fn().mockRejectedValue(problem(409, { detail: "The document is being processed." }));
    render(<Harness onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The document is being processed.");
    expect(screen.getByTestId("open")).toHaveTextContent("true");
    expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();
  });
});
