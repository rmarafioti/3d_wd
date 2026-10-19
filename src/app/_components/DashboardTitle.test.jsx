// Tests for DashboardTitle (docs/flows.md → App Shell): nothing with no user, "Admin Dashboard"
// for an admin, "{name}'s Dashboard" for a site owner.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardTitle from "./DashboardTitle";
import { AuthContext } from "../_context/AuthContext";

function renderWithUser(user) {
  return render(
    <AuthContext.Provider value={{ user, setUser: vi.fn() }}>
      <DashboardTitle />
    </AuthContext.Provider>,
  );
}

describe("DashboardTitle", () => {
  it("shows nothing when no one is signed in", () => {
    const { container } = renderWithUser(null);

    expect(container).toBeEmptyDOMElement();
  });

  it('reads "Admin Dashboard" for an admin', () => {
    renderWithUser({
      id: "u1",
      name: "Rich",
      email: "a@example.com",
      role: "admin",
    });

    expect(screen.getByText("Admin Dashboard")).toBeInTheDocument();
  });

  it("reads the site owner's name for a site owner", () => {
    renderWithUser({
      id: "u2",
      name: "Richard Marafioti",
      email: "steviethedogchi@gmail.com",
      role: "site_owner",
    });

    expect(
      screen.getByText("Richard Marafioti's Dashboard"),
    ).toBeInTheDocument();
  });
});
