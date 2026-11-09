// Tests for DashboardLayout's wiring: the Abilities aside on every /dashboard route, reading the
// same websites as the page.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthProvider } from "../_context/AuthContext";
import DashboardLayout from "./DashboardLayout";
import RecentlyDeletedPage from "../dashboard/deleted/page";
import { mockFetch } from "../../test/helpers";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/dashboard/deleted",
}));

const SITE_OWNER = {
  id: "u2",
  name: "Richard Marafioti",
  email: "steviethedogchi@gmail.com",
  role: "site_owner",
};
const WEBSITE = {
  id: "w1",
  websiteName: "Stevie The Dog",
  url: "https://www.steviethedog.com",
  active: true,
  abilities: [],
  posts: [],
  galleries: [],
};

describe("Dashboard layout", () => {
  it("shows the Abilities aside on a route other than /dashboard, fetching the websites once", async () => {
    const { calls } = mockFetch({
      "GET /api/auth/me": { body: { data: SITE_OWNER } },
      "GET /api/siteOwner/websites": { body: { data: [WEBSITE] } },
      "GET /api/siteOwner/deleted": {
        body: { data: [], nextCursor: null },
      },
    });

    render(
      <AuthProvider>
        <DashboardLayout>
          <RecentlyDeletedPage />
        </DashboardLayout>
      </AuthProvider>,
    );

    expect(
      await screen.findByRole("button", { name: "Abilities" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Nothing has been deleted in the last 30 days."),
    ).toBeInTheDocument();
    expect(
      calls.filter((call) => call.path === "/api/siteOwner/websites"),
    ).toHaveLength(1);
  });
});
