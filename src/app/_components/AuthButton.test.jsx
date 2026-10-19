// Tests for AuthButton (docs/flows.md → App Shell, Sign Out): "Sign in" with no user; "Sign out"
// logs out, clears the user and goes home with a full page load, even when the logout request
// fails. A full load (not a client-side route) is what stops the router cache from replaying the
// proxy's signed-in redirect back to /dashboard.

import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuthButton from "./AuthButton";
import { AuthContext } from "../_context/AuthContext";
import { mockFetch, stubLocation } from "../../test/helpers";

const USER = {
  id: "u1",
  name: "Rich",
  email: "rich@example.com",
  role: "admin",
};

function renderWithUser(user) {
  const setUser = vi.fn();
  render(
    <AuthContext.Provider value={{ user, setUser }}>
      <AuthButton />
    </AuthContext.Provider>,
  );
  return { setUser };
}

describe("AuthButton", () => {
  it('links to /sign-in with "Sign in" when no one is signed in', () => {
    renderWithUser(null);

    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/sign-in",
    );
  });

  it("logs out, clears the user and does a full page load to / on Sign out", async () => {
    const { calls } = mockFetch({ "POST /api/auth/logout": { status: 204 } });
    const { assign } = stubLocation();
    const { setUser } = renderWithUser(USER);

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith("/"));
    expect(calls[0]).toMatchObject({
      method: "POST",
      path: "/api/auth/logout",
    });
    expect(setUser).toHaveBeenCalledWith(null);
  });

  it("still clears the user and does a full page load to / when the logout request fails", async () => {
    mockFetch({ "POST /api/auth/logout": { networkError: true } });
    const { assign } = stubLocation();
    const { setUser } = renderWithUser(USER);

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith("/"));
    expect(setUser).toHaveBeenCalledWith(null);
  });
});
