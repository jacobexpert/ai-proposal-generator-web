import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { server } from "@/mocks/server";
import { renderWithProviders } from "@/test/render";

import { LoginForm } from "./login-form";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const LOGIN = "http://localhost:3000/api/auth/login";

async function fillAndSubmit(email = "jackie@example.com", password = "correct horse") {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), email);
  await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("LoginForm", () => {
  beforeEach(() => {
    router.replace.mockReset();
    router.refresh.mockReset();
  });

  it("validates fields before calling the BFF", async () => {
    const spy = vi.fn();
    server.use(http.post(LOGIN, () => spy()));
    renderWithProviders(<LoginForm returnUrl="/" />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Enter your email.")).toBeInTheDocument();
    expect(screen.getByText("Enter your password.")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(spy).not.toHaveBeenCalled();
  });

  it("rejects an invalid email format", async () => {
    renderWithProviders(<LoginForm returnUrl="/" />);
    await fillAndSubmit("not-an-email");
    expect(await screen.findByText("Enter a valid email.")).toBeInTheDocument();
  });

  it("signs in, clears cached data and goes to the returnUrl", async () => {
    let body: unknown;
    server.use(
      http.post(LOGIN, async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { client } = renderWithProviders(<LoginForm returnUrl="/proposals/42" />);
    client.setQueryData(["stale"], { from: "previous user" });

    await fillAndSubmit();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/proposals/42"));
    expect(router.refresh).toHaveBeenCalled();
    expect(body).toEqual({ email: "jackie@example.com", password: "correct horse" });
    expect(client.getQueryData(["stale"])).toBeUndefined();
  });

  it("shows a generic message on 401 (does not reveal which field is wrong)", async () => {
    server.use(http.post(LOGIN, () => HttpResponse.json({ status: 401 }, { status: 401 })));
    renderWithProviders(<LoginForm returnUrl="/" />);
    await fillAndSubmit();
    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password.");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("tells the user when to retry after too many attempts (429 + Retry-After)", async () => {
    server.use(
      http.post(LOGIN, () => HttpResponse.json({ status: 429 }, { status: 429, headers: { "Retry-After": "900" } })),
    );
    renderWithProviders(<LoginForm returnUrl="/" />);
    await fillAndSubmit();
    expect(await screen.findByRole("alert")).toHaveTextContent("Try again in 15 minutes.");
  });

  it("binds 400 field errors from the server to the fields", async () => {
    server.use(
      http.post(LOGIN, () =>
        HttpResponse.json(
          { status: 400, errors: [{ field: "email", message: "must be a well-formed email address" }] },
          { status: 400 },
        ),
      ),
    );
    renderWithProviders(<LoginForm returnUrl="/" />);
    await fillAndSubmit();
    expect(await screen.findByText("must be a well-formed email address")).toBeInTheDocument();
  });

  it("shows the trace id on server errors and a connection message when offline", async () => {
    server.use(http.post(LOGIN, () => HttpResponse.json({ status: 500, traceId: "t-9" }, { status: 500 })));
    const { unmount } = renderWithProviders(<LoginForm returnUrl="/" />);
    await fillAndSubmit();
    expect(await screen.findByText("Trace ID: t-9")).toBeInTheDocument();
    unmount();

    server.use(http.post(LOGIN, () => HttpResponse.error()));
    renderWithProviders(<LoginForm returnUrl="/" />);
    await fillAndSubmit();
    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't reach the server");
  });
});
