import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Outlet, useLocation } from "react-router-dom";
import AppRoutes from "../routes/AppRoutes";

const authState = vi.hoisted(() => ({ user: null, loading: false }));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("../layouts/CitizenLayout", () => ({
  default: () => <Outlet />,
}));
vi.mock("../layouts/GovernmentLayout", () => ({
  default: () => <Outlet />,
}));
vi.mock("../layouts/PublicLayout", () => ({
  default: () => <Outlet />,
}));
vi.mock("../pages/CitizenDashboard", () => ({
  default: () => <div>citizen-dashboard</div>,
}));
vi.mock("../pages/GovDashboard", () => ({
  default: () => <div>government-dashboard</div>,
}));
vi.mock("../pages/GovAnalytics", () => ({
  default: () => <div>platform-analytics</div>,
}));
vi.mock("../pages/Login", () => ({
  default: () => <div>login-page</div>,
}));
vi.mock("../pages/TransportCitizenPortal", () => ({
  default: () => <div>public-service-information</div>,
}));

function CurrentPath() {
  const { pathname } = useLocation();
  return <output aria-label="current route">{pathname}</output>;
}

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
      <CurrentPath />
    </MemoryRouter>
  );
}

beforeEach(() => {
  authState.user = null;
  authState.loading = false;
  localStorage.clear();
});

afterEach(() => cleanup());

describe("portal route isolation", () => {
  it("allows citizens into citizen routes", async () => {
    authState.user = { role: "citizen" };
    renderAt("/app");

    expect(await screen.findByText("citizen-dashboard")).toBeDefined();
    expect(screen.getByLabelText("current route").textContent).toBe("/app");
  });

  it("redirects citizens away from government routes", async () => {
    authState.user = { role: "citizen" };
    renderAt("/government/dashboard");

    expect(await screen.findByText("citizen-dashboard")).toBeDefined();
    expect(screen.getByLabelText("current route").textContent).toBe("/app");
  });

  it("allows staff into government routes", async () => {
    authState.user = { role: "staff" };
    renderAt("/government/dashboard");

    expect(await screen.findByText("government-dashboard")).toBeDefined();
    expect(screen.getByLabelText("current route").textContent).toBe("/government/dashboard");
  });

  it("redirects staff away from citizen routes", async () => {
    authState.user = { role: "staff" };
    renderAt("/app/profile");

    expect(await screen.findByText("government-dashboard")).toBeDefined();
    expect(screen.getByLabelText("current route").textContent).toBe("/government/dashboard");
  });

  it("redirects unauthenticated users to login", async () => {
    renderAt("/app/complaints");

    expect(await screen.findByText("login-page")).toBeDefined();
    expect(screen.getByLabelText("current route").textContent).toBe("/login");
  });

  it("restricts platform admins to administrative routes", async () => {
    authState.user = { role: "platform_admin" };
    renderAt("/government/complaints");

    expect(await screen.findByText("platform-analytics")).toBeDefined();
    expect(screen.getByLabelText("current route").textContent).toBe("/government/analytics");
  });

  it("does not grant citizen routes when localStorage claims the user is a citizen", async () => {
    authState.user = { role: "staff" };
    localStorage.setItem("co_user", JSON.stringify({ role: "citizen" }));
    renderAt("/app");

    await waitFor(() => expect(screen.getByLabelText("current route").textContent).toBe("/government/dashboard"));
    expect(screen.getByText("government-dashboard")).toBeDefined();
  });

  it("keeps public service information accessible without authentication", async () => {
    renderAt("/services/transport");

    expect(await screen.findByText("public-service-information")).toBeDefined();
    expect(screen.getByLabelText("current route").textContent).toBe("/services/transport");
  });
});
