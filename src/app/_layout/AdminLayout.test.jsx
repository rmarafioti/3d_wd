// Tests for the admin layout's wiring (docs/flows.md → Admin Dashboard): the page and the Accounts
// aside share one AdminDataContext, so an account created in the page shows in the open aside.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "../_context/AuthContext";
import AdminLayout from "./AdminLayout";
import AdminPage from "../admin/page";
import { mockFetch } from "../../test/helpers";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const ADMIN = {
  id: "u1",
  name: "Rich",
  email: "rich@example.com",
  role: "admin",
};
const STEVIE = {
  id: "w1",
  websiteName: "Stevie The Dog",
  url: "https://www.steviethedog.com",
  active: true,
};
const NEW_ACCOUNT = {
  id: "a2",
  name: "Jane Doe",
  email: "jane@example.com",
  role: "site_owner",
  active: true,
  createdAt: "2026-10-11T00:00:00.000Z",
};

describe("Admin layout", () => {
  it("shows an account created in the page in the open Accounts aside", async () => {
    mockFetch({
      "GET /api/auth/me": { body: { data: ADMIN } },
      "GET /api/admin/accounts": [
        { body: { data: [] } },
        {
          body: {
            data: [
              { ...NEW_ACCOUNT, websites: [{ ...STEVIE, galleries: [] }] },
            ],
          },
        },
      ],
      "GET /api/admin/websites": { body: { data: [STEVIE] } },
      "POST /api/admin/accounts": {
        status: 201,
        body: { data: { account: NEW_ACCOUNT, website: STEVIE } },
      },
    });
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <AdminLayout>
          <AdminPage />
        </AdminLayout>
      </AuthProvider>,
    );
    await user.click(await screen.findByRole("button", { name: "Accounts" }));
    expect(
      await screen.findByText("No site owner accounts yet."),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText("Site Owner Name"), "Jane Doe");
    await user.type(
      screen.getByLabelText("Site Owner Email"),
      "jane@example.com",
    );
    await user.selectOptions(
      screen.getByLabelText("Choose a website"),
      "Stevie The Dog",
    );

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByText("jane@example.com")).toBeInTheDocument();
  });
});
