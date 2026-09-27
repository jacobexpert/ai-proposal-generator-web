import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { server } from "@/mocks/server";
import { renderWithProviders } from "@/test/render";

import { RegisterForm } from "./register-form";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const { toastSuccess } = vi.hoisted(() => ({ toastSuccess: vi.fn() }));
vi.mock("sonner", async (orig) => {
  const actual = await orig<typeof import("sonner")>();
  return { ...actual, toast: Object.assign(vi.fn(), actual.toast, { success: toastSuccess }) };
});

const REGISTER = "http://localhost:3000/api/auth/register";
const WORKSPACE_ID = "7c9d2e4f-5b6a-4d3c-8e1f-2a3b4c5d6e7f";

const PASSWORD = "a long enough password";

async function fill({
  email = "new@example.com",
  name = "New Person",
  password = PASSWORD,
  confirm = PASSWORD as string,
  workspace = "",
}: { email?: string; name?: string; password?: string; confirm?: string; workspace?: string } = {}) {
  const user = userEvent.setup();
  if (email) await user.type(screen.getByLabelText("Work email"), email);
  if (name) await user.type(screen.getByLabelText("Your name"), name);
  if (password) await user.type(screen.getByLabelText("Password"), password);
  if (confirm) await user.type(screen.getByLabelText("Confirm password"), confirm);
  if (workspace) await user.type(screen.getByLabelText(/Workspace name/), workspace);
  await user.click(screen.getByRole("button", { name: "Create account" }));
}

const problem = (status: number, body: Record<string, unknown> = {}, headers: Record<string, string> = {}) =>
  HttpResponse.json(
    { status, title: "x", ...body },
    { status, headers: { "Content-Type": "application/problem+json", ...headers } },
  );

describe("RegisterForm", () => {
  beforeEach(() => {
    router.replace.mockReset();
    router.refresh.mockReset();
    toastSuccess.mockReset();
  });

  it("validates like the API before calling the BFF (AC2)", async () => {
    const spy = vi.fn();
    server.use(http.post(REGISTER, () => spy()));
    renderWithProviders(<RegisterForm />);
    await fill({ email: "", name: "", password: "short", confirm: "other" });

    expect(await screen.findByText("Enter your email.")).toBeInTheDocument();
    expect(screen.getByText("Enter your name.")).toBeInTheDocument();
    expect(screen.getByText("Use at least 12 characters.")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Password")).toHaveAttribute("aria-describedby", "password-hint password-error");
    expect(spy).not.toHaveBeenCalled();
  });

  it("rejects a password equal to the email and mismatched confirmation", async () => {
    renderWithProviders(<RegisterForm />);
    await fill({ email: "me@example.com", password: "ME@example.com", confirm: "different value!" });
    expect(await screen.findByText("Your password can't be your email.")).toBeInTheDocument();
    expect(screen.getByText("Passwords don't match.")).toBeInTheDocument();
  });

  it("shows the password length and suggests the default workspace name", async () => {
    renderWithProviders(<RegisterForm />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Your name"), "Jackie");
    expect(screen.getByLabelText(/Workspace name/)).toHaveAttribute("placeholder", "Jackie's workspace");
    await user.type(screen.getByLabelText("Password"), "12345");
    expect(screen.getByText("5/12")).toBeInTheDocument();
  });

  it("creates the account, greets the user and opens the dashboard (AC3)", async () => {
    let body: unknown;
    server.use(
      http.post(REGISTER, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ workspaceId: WORKSPACE_ID }, { status: 201 });
      }),
    );
    const { client } = renderWithProviders(<RegisterForm />);
    client.setQueryData(["me"], { stale: true });
    await fill({ workspace: "Acme Team" });

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
    expect(body).toEqual({
      email: "new@example.com",
      displayName: "New Person",
      password: "a long enough password",
      workspaceName: "Acme Team",
    });
    expect(toastSuccess).toHaveBeenCalledWith("Welcome, New Person!", { description: "Your workspace is ready." });
    expect(client.getQueryData(["me"])).toBeUndefined();
  });

  it("409: says the email is registered and links to sign in (AC4)", async () => {
    server.use(http.post(REGISTER, () => problem(409, { detail: "Email already registered" })));
    renderWithProviders(<RegisterForm />);
    await fill();
    expect(await screen.findByText(/An account with this email already exists/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in instead" })).toHaveAttribute("href", "/login");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("400: puts the API's field errors on the fields (AC4)", async () => {
    server.use(
      http.post(REGISTER, () => problem(400, { errors: [{ field: "email", message: "Email is not allowed." }] })),
    );
    renderWithProviders(<RegisterForm />);
    await fill();
    expect(await screen.findByText("Email is not allowed.")).toBeInTheDocument();
    expect(screen.getByLabelText("Work email")).toHaveAttribute("aria-invalid", "true");
  });

  it("429: tells the user when to try again (AC4)", async () => {
    server.use(http.post(REGISTER, () => problem(429, {}, { "Retry-After": "1800" })));
    renderWithProviders(<RegisterForm />);
    await fill();
    expect(await screen.findByText(/Too many sign-up attempts\. Try again in 30 minutes\./)).toBeInTheDocument();
  });

  it("5xx: shows the trace id", async () => {
    server.use(http.post(REGISTER, () => problem(500, { traceId: "trace-42" })));
    renderWithProviders(<RegisterForm />);
    await fill();
    expect(await screen.findByText("Trace ID: trace-42")).toBeInTheDocument();
  });
});
