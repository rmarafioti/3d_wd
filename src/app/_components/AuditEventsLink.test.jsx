// Tests for AuditEventsLink (docs/flows.md → App Shell): the Navbar's "Audit Events" link shows
// for the admin only.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AuditEventsLink from "./AuditEventsLink";
import { AuthContext } from "../_context/AuthContext";

function renderWithUser(user) {
  return render(
    <AuthContext.Provider value={{ user, setUser: vi.fn() }}>
      <AuditEventsLink />
    </AuthContext.Provider>,
  );
}

describe("AuditEventsLink", () => {
  it("links the admin to /admin/auditEvents", () => {
    renderWithUser({
      id: "u1",
      name: "Rich",
      email: "a@example.com",
      role: "admin",
    });

    expect(screen.getByRole("link", { name: "Audit Events" })).toHaveAttribute(
      "href",
      "/admin/auditEvents",
    );
  });

  it.each([
    [
      "a site owner",
      { id: "u2", name: "Stevie", email: "s@example.com", role: "site_owner" },
    ],
    ["no one signed in", null],
  ])("shows nothing to %s", (_, user) => {
    renderWithUser(user);

    expect(
      screen.queryByRole("link", { name: "Audit Events" }),
    ).not.toBeInTheDocument();
  });
});
