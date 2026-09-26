import { useMutation, useQuery } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Providers } from "@/app/providers";
import { ApiError } from "@/lib/api/client";

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));
vi.mock("sonner", async (orig) => {
  const actual = await orig<typeof import("sonner")>();
  return { ...actual, toast: Object.assign(vi.fn(), actual.toast, { error: toastError }) };
});

const err = (status: number) => new ApiError(status, { status, title: "Failed", traceId: "t-1" });

function MutationButton({ error, errorToast }: { error: unknown; errorToast?: boolean }) {
  const m = useMutation({
    mutationFn: () => Promise.reject(error),
    meta: errorToast === undefined ? undefined : { errorToast },
  });
  return <button onClick={() => m.mutate()}>{m.isError ? "failed" : "go"}</button>;
}

async function runMutation(error: unknown, errorToast?: boolean) {
  render(
    <Providers>
      <MutationButton error={error} errorToast={errorToast} />
    </Providers>,
  );
  await userEvent.click(screen.getByRole("button", { name: "go" }));
  await screen.findByRole("button", { name: "failed" });
}

describe("Providers error policy", () => {
  beforeEach(() => toastError.mockClear());

  it("toasts a 5xx mutation failure with its trace id", async () => {
    await runMutation(err(500));
    expect(toastError).toHaveBeenCalledOnce();
    expect(JSON.stringify(toastError.mock.calls[0])).toContain("t-1");
  });

  it("toasts a 409 mutation failure", async () => {
    await runMutation(err(409));
    expect(toastError).toHaveBeenCalledOnce();
  });

  it("does not toast a 400 (shown on the form)", async () => {
    await runMutation(err(400));
    expect(toastError).not.toHaveBeenCalled();
  });

  it("does not toast when meta.errorToast is false", async () => {
    await runMutation(err(500), false);
    expect(toastError).not.toHaveBeenCalled();
  });

  it("does not toast a failed first query load (the screen shows ErrorState)", async () => {
    function Q() {
      const q = useQuery({ queryKey: ["x"], queryFn: () => Promise.reject(err(404)), retry: false });
      return <p>{q.isError ? "error" : "loading"}</p>;
    }
    render(
      <Providers>
        <Q />
      </Providers>,
    );
    await screen.findByText("error");
    expect(toastError).not.toHaveBeenCalled();
  });
});
