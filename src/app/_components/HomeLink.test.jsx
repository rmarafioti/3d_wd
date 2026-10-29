// Tests for HomeLink (docs/flows.md → App Shell): "3D Web Dev" leads to the signed-in user's
// dashboard by role, or to the landing page when no one is signed in.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import HomeLink from "./HomeLink";
import { AuthContext } from "../_context/AuthContext";

function renderWithUser(user) {
  return render(
    <AuthContext.Provider value={{ user, setUser: vi.fn() }}>
      <HomeLink />
    </AuthContext.Provider>,
  );
}

describe("HomeLink", () => {
  it("leads to the landing page when no one is signed in", () => {
    renderWithUser(null);

    expect(
      screen.getByRole("link", { name: "3D Web Dev home" }),
    ).toHaveAttribute("href", "/");
  });

  it.each([
    ["admin", "/admin"],
    ["site_owner", "/dashboard"],
  ])("leads a signed-in %s to %s", (role, home) => {
    renderWithUser({ id: "u1", name: "Rich", email: "a@example.com", role });

    expect(
      screen.getByRole("link", { name: "3D Web Dev home" }),
    ).toHaveAttribute("href", home);
  });
});
