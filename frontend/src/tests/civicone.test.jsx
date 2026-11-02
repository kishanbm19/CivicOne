import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import StatusBadge, {
  COMPLAINT_STATUSES,
  COMPLAINT_STATUS_TRANSITIONS,
} from "../components/common/StatusBadge";
import PriorityBadge from "../components/common/PriorityBadge";
import NoticeCard from "../components/dashboard/NoticeCard";
import StatCard from "../components/dashboard/StatCard";
import { Unauthorized, NotFound } from "../pages/Misc";
import Logo from "../components/common/Logo";
import GovComplaints from "../pages/GovComplaints";
import GovDashboard from "../pages/GovDashboard";
import Landing from "../pages/Landing";
import CitizenDashboard from "../pages/CitizenDashboard";

const complaintServiceMocks = vi.hoisted(() => ({
  listComplaints: vi.fn(),
  listComplaintStaffOptions: vi.fn(),
}));

const publicServiceMocks = vi.hoisted(() => ({
  getPublicStats: vi.fn(),
  listPublicDocuments: vi.fn(),
}));

const departmentServiceMocks = vi.hoisted(() => ({
  getDepartmentAnalytics: vi.fn(),
}));

const documentServiceMocks = vi.hoisted(() => ({
  listPublicDocuments: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

vi.mock("../services/complaints", () => complaintServiceMocks);
vi.mock("../services", () => publicServiceMocks);
vi.mock("../services/services", () => departmentServiceMocks);
vi.mock("../services/documents", () => documentServiceMocks);
vi.mock("../context/AuthContext", () => authMocks);
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  LineChart: () => null,
  Line: () => null,
  PieChart: () => null,
  Pie: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null,
}));

afterEach(cleanup);
beforeEach(() => {
  complaintServiceMocks.listComplaints.mockReset().mockResolvedValue({ items: [], total: 0 });
  complaintServiceMocks.listComplaintStaffOptions.mockReset().mockResolvedValue([]);
  departmentServiceMocks.getDepartmentAnalytics.mockReset().mockResolvedValue({
    trends: [],
    category_distribution: [],
  });
  documentServiceMocks.listPublicDocuments.mockReset().mockResolvedValue({ items: [] });
  authMocks.useAuth.mockReset().mockReturnValue({
    user: { id: "staff-7", full_name: "Test Staff" },
  });
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

  it("renders the four supported complaint statuses with friendly labels", () => {
    const { rerender } = render(<StatusBadge status="submitted" />);
    expect(screen.getByText("Pending")).toBeDefined();

    rerender(<StatusBadge status="assigned" />);
    expect(screen.getByText("Assigned")).toBeDefined();

    rerender(<StatusBadge status="in_progress" />);
    expect(screen.getByText("In Progress")).toBeDefined();

    rerender(<StatusBadge status="resolved" />);
    expect(screen.getByText("Resolved")).toBeDefined();
    expect(COMPLAINT_STATUSES).toHaveLength(4);
  });

  it("does not map legacy complaint status values to an allowed status", () => {
    render(<StatusBadge status="legacy_value" />);
    expect(screen.getByText("Unsupported status")).toBeDefined();
    expect(COMPLAINT_STATUSES.map(({ value }) => value)).toEqual([
      "submitted",
      "assigned",
      "in_progress",
      "resolved",
    ]);
  });

  it("allows only forward complaint status transitions", () => {
    expect(COMPLAINT_STATUS_TRANSITIONS).toEqual({
      submitted: ["assigned"],
      assigned: ["in_progress"],
      in_progress: ["resolved"],
      resolved: [],
    });
  });

  it("renders status badges with user-friendly labels", () => {
    render(<StatusBadge status="in_progress" />);
    expect(screen.getByText("In Progress")).toBeDefined();
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

  it("offers only valid complaint statuses in the staff filter", async () => {
    render(
      <MemoryRouter>
        <GovComplaints />
      </MemoryRouter>
    );
    const statusFilter = (await screen.findAllByRole("combobox"))[0];
    const labels = Array.from(statusFilter.options, (option) => option.textContent);
    expect(labels).toEqual([
      "All Statuses",
      "Pending",
      "Assigned",
      "In Progress",
      "Resolved",
    ]);
  });

  it("renders exactly five staff dashboard metrics using server-filtered counts", async () => {
    complaintServiceMocks.listComplaints.mockImplementation((params = {}) => {
      if (params.overdue_only) {
        return Promise.resolve({ items: [], total: params.status === "in_progress" ? 4 : 0 });
      }
      const countByStatus = {
        submitted: 8,
        assigned: 3,
        in_progress: 6,
        resolved: 2,
      };
      return Promise.resolve({
        items: [],
        total: params.assigned_to_me ? 3 : (countByStatus[params.status] || 0),
      });
    });

    render(
      <MemoryRouter>
        <GovDashboard />
      </MemoryRouter>
    );

    expect(await screen.findByText("Assigned to Me")).toBeDefined();
    expect(screen.getByText("Pending")).toBeDefined();
    expect(screen.getByText("In Progress")).toBeDefined();
    expect(screen.getByText("Resolved")).toBeDefined();
    expect(screen.getByText("Overdue")).toBeDefined();
    expect(screen.getAllByText(/^(Pending|Assigned to Me|In Progress|Resolved|Overdue)$/)).toHaveLength(5);
    expect(complaintServiceMocks.listComplaints).toHaveBeenCalledWith(
      expect.objectContaining({ status: "assigned", assigned_to_me: true })
    );
    expect(complaintServiceMocks.listComplaints).toHaveBeenCalledWith(
      expect.objectContaining({ status: "submitted", overdue_only: true })
    );
    expect(screen.getByText("4")).toBeDefined();
  });

  it("requests citizen complaint counts by status without submitting another user's ID", async () => {
    complaintServiceMocks.listComplaints.mockImplementation((params = {}) =>
      Promise.resolve({ items: [], total: params.status ? 1 : 0 })
    );

    render(
      <MemoryRouter>
        <CitizenDashboard />
      </MemoryRouter>
    );

    expect(await screen.findByText("Pending")).toBeDefined();
    expect(screen.getByText("Assigned")).toBeDefined();
    expect(screen.getByText("In Progress")).toBeDefined();
    expect(screen.getByText("Resolved")).toBeDefined();
    expect(complaintServiceMocks.listComplaints).toHaveBeenCalledWith(
      expect.objectContaining({ status: "submitted", size: 1 })
    );
    expect(complaintServiceMocks.listComplaints.mock.calls.every(
      ([params]) => !Object.hasOwn(params, "citizen_id")
    )).toBe(true);
  });
});
