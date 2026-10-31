import { beforeEach, describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import StatusBadge from "../components/common/StatusBadge";
import PriorityBadge from "../components/common/PriorityBadge";
import NoticeCard from "../components/dashboard/NoticeCard";
import StatCard from "../components/dashboard/StatCard";
import { Unauthorized, NotFound } from "../pages/Misc";
import Logo from "../components/common/Logo";
import GovComplaints from "../pages/GovComplaints";
import Landing from "../pages/Landing";

const complaintServiceMocks = vi.hoisted(() => ({
  listComplaints: vi.fn(),
  listComplaintStaffOptions: vi.fn(),
}));

const publicServiceMocks = vi.hoisted(() => ({
  getPublicStats: vi.fn(),
  listPublicDocuments: vi.fn(),
}));

vi.mock("../services/complaints", () => complaintServiceMocks);
vi.mock("../services", () => publicServiceMocks);

beforeEach(() => {
  complaintServiceMocks.listComplaints.mockReset().mockResolvedValue({ items: [], total: 0 });
  complaintServiceMocks.listComplaintStaffOptions.mockReset().mockResolvedValue([]);
  publicServiceMocks.getPublicStats.mockReset().mockResolvedValue({
    total_complaints: 0,
    issues_resolved: 0,
    in_progress: 0,
    resolution_rate: null,
    requests_by_domain: {},
  });
  publicServiceMocks.listPublicDocuments.mockReset().mockResolvedValue({ items: [] });
});

describe("CivicOne Design System & Components", () => {
  it("renders Logo with CivicOne branding", () => {
    render(
      <BrowserRouter>
        <Logo />
      </BrowserRouter>
    );
    expect(screen.getByText("Civic")).toBeDefined();
    expect(screen.getByText("One")).toBeDefined();
  });

  it("shows a professional public landing page without fabricated metrics", async () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );

    expect(screen.getByText("A clearer way to")).toBeDefined();
    expect(await screen.findByText("Civic service overview")).toBeDefined();
    expect(await screen.findByText("There are no published notices at this time.")).toBeDefined();
    expect(screen.queryByText("1,245")).toBeNull();
    expect(publicServiceMocks.getPublicStats).toHaveBeenCalledOnce();
    expect(publicServiceMocks.listPublicDocuments).toHaveBeenCalledOnce();
  });

  it("renders database-backed public request counts by service area", async () => {
    publicServiceMocks.getPublicStats.mockResolvedValue({
      total_complaints: 3,
      issues_resolved: 1,
      in_progress: 2,
      resolution_rate: 33,
      requests_by_domain: {
        transport: { total: 3, resolved: 1, in_progress: 2, pending: 0, rejected: 0 },
      },
    });

    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );

    expect(await screen.findByText("Requests by service area")).toBeDefined();
    expect(screen.getAllByText("Transport Services").length).toBeGreaterThan(1);
    expect(screen.getByText("Resolved: 1")).toBeDefined();
    expect(screen.getByText("In progress: 2")).toBeDefined();
    expect(screen.getAllByText("Municipal Services").length).toBeGreaterThan(1);
  });

  it("renders status badges with formatted status keys", () => {
    render(<StatusBadge status="in_progress" />);
    expect(screen.getByText("in progress")).toBeDefined();
  });

  it("renders priority badge with appropriate styling", () => {
    render(<PriorityBadge priority="high" />);
    expect(screen.getByText("high")).toBeDefined();
  });

  it("renders StatCard with value and label", () => {
    render(<StatCard title="Issues Resolved This Month" value="1,245" color="green" />);
    expect(screen.getByText("1,245")).toBeDefined();
    expect(screen.getByText("Issues Resolved This Month")).toBeDefined();
  });

  it("renders NoticeCard with title, badge and date", () => {
    render(
      <NoticeCard
        title="Route 45 Schedule Updated"
        description="New timetable effective from Oct 25, 2026."
        date="Oct 22, 2026"
        badgeText="Announcement"
        badgeType="announcement"
      />
    );
    expect(screen.getByText("Route 45 Schedule Updated")).toBeDefined();
    expect(screen.getByText("Announcement")).toBeDefined();
    expect(screen.getByText("Oct 22, 2026")).toBeDefined();
  });

  it("renders Unauthorized access restricted view", () => {
    render(
      <BrowserRouter>
        <Unauthorized />
      </BrowserRouter>
    );
    expect(screen.getByText("Portal Access Restricted")).toBeDefined();
    expect(screen.getByText("Return Home")).toBeDefined();
  });

  it("renders 404 Not Found view", () => {
    render(
      <BrowserRouter>
        <NotFound />
      </BrowserRouter>
    );
    expect(screen.getByText("Page Not Found")).toBeDefined();
  });

  it("provides category, date, and assigned-staff complaint filters", async () => {
    render(
      <MemoryRouter>
        <GovComplaints />
      </MemoryRouter>
    );
    await waitFor(() => expect(complaintServiceMocks.listComplaints).toHaveBeenCalled());
    expect(screen.getByLabelText("Filter by category")).toBeDefined();
    expect(screen.getByLabelText("Filter by assigned staff")).toBeDefined();
    expect(screen.getByLabelText("Created from")).toBeDefined();
    expect(screen.getByLabelText("Created through")).toBeDefined();
  });
});
