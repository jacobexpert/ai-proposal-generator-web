import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { API_BASE_URL } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { renderWithProviders } from "@/test/render";

import { SystemHealthPanel } from "./system-health-panel";

const healthUrl = `${API_BASE_URL}/actuator/health`;

describe("SystemHealthPanel", () => {
  it("shows the overall and per-component status when the backend is up", async () => {
    renderWithProviders(<SystemHealthPanel />);
    expect(await screen.findByText("db")).toBeInTheDocument();
    expect(screen.getAllByText("UP")).toHaveLength(3);
  });

  it("reports an error status with its trace id", async () => {
    server.use(
      http.get(healthUrl, () =>
        HttpResponse.json(
          { title: "Service Unavailable", status: 503, traceId: "trace-42" },
          { status: 503, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    );
    renderWithProviders(<SystemHealthPanel />);
    expect(await screen.findByText("The backend answered 503.")).toBeInTheDocument();
    expect(screen.getByText("Trace ID: trace-42")).toBeInTheDocument();
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
  });

  it("explains when the backend cannot be reached", async () => {
    server.use(http.get(healthUrl, () => HttpResponse.error()));
    renderWithProviders(<SystemHealthPanel />);
    expect(await screen.findByText("The backend could not be reached.")).toBeInTheDocument();
  });

  it("rejects a response that does not match the health schema", async () => {
    server.use(http.get(healthUrl, () => HttpResponse.json({ unexpected: true })));
    renderWithProviders(<SystemHealthPanel />);
    expect(await screen.findByText("The backend returned an unexpected response.")).toBeInTheDocument();
  });

  it("renders untrusted status text as text, not HTML", async () => {
    server.use(http.get(healthUrl, () => HttpResponse.json({ status: "<img src=x onerror=alert(1)>" })));
    const { container } = renderWithProviders(<SystemHealthPanel />);
    expect(await screen.findByText("<img src=x onerror=alert(1)>")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });
});
