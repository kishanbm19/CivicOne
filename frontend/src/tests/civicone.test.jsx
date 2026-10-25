import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import StatusBadge from "../components/common/StatusBadge";
import PriorityBadge from "../components/common/PriorityBadge";
import NoticeCard from "../components/dashboard/NoticeCard";
import StatCard from "../components/dashboard/StatCard";
import { Unauthorized, NotFound } from "../pages/Misc";
import Logo from "../components/common/Logo";

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
});
