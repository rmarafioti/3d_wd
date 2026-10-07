// Tests for useRoleGate: the layout-level role check (CLAUDE.md → Role-gating). A matching role
// fills AuthContext; any other role is redirected to its own dashboard while loading stays on.

import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { AuthProvider } from "../_context/AuthContext";
import { useAuth } from "./useAuth";
import { useRoleGate } from "./useRoleGate";
import { mockFetch } from "../../test/helpers";

const router = { push: vi.fn(), replace: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const ADMIN = {
  id: "u1",
  name: "Rich",
  email: "rich@example.com",
  role: "admin",
};

// Renders the gate together with useAuth so the test can see what landed in AuthContext.
function renderGate(requiredRole) {
  return renderHook(
    () => ({ gate: useRoleGate(requiredRole), auth: useAuth() }),
    { wrapper: AuthProvider },
  );
}

describe("useRoleGate", () => {
  it("stores the user in AuthContext and stops loading when the role matches", async () => {
    mockFetch({ "GET /api/auth/me": { body: { data: ADMIN } } });

    const { result } = renderGate("admin");

    await waitFor(() => expect(result.current.gate.loading).toBe(false));
    expect(result.current.gate.data).toEqual(ADMIN);
    expect(result.current.auth.user).toEqual(ADMIN);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it.each([
    ["an admin on /dashboard", "site_owner", "admin", "/admin"],
    ["a site owner on /admin", "admin", "site_owner", "/dashboard"],
    ["an unknown role", "admin", "editor", "/"],
  ])(
    "redirects %s and stays loading",
    async (_label, requiredRole, role, home) => {
      mockFetch({ "GET /api/auth/me": { body: { data: { ...ADMIN, role } } } });

      const { result } = renderGate(requiredRole);

      await waitFor(() => expect(router.replace).toHaveBeenCalledWith(home));
      expect(result.current.gate.loading).toBe(true);
      expect(result.current.auth.user).toBeNull();
    },
  );

  it("ends with the error when /me fails with something other than a 401", async () => {
    mockFetch({
      "GET /api/auth/me": {
        status: 500,
        body: { error: { message: "Something went wrong, please try again." } },
      },
    });

    const { result } = renderGate("admin");

    await waitFor(() => expect(result.current.gate.loading).toBe(false));
    expect(result.current.gate.error.message).toBe(
      "Something went wrong, please try again.",
    );
  });
});
