// Tests for Navbar: the signed-out row, each role's links (Create a Gallery through NavContext) and
// the phone menu's opening and closing.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Navbar from "./Navbar";
import { AuthContext } from "../_context/AuthContext";
import { NavProvider } from "../_context/NavContext";
import { SiteOwnerDataProvider } from "../_context/SiteOwnerDataContext";
import { mockFetch } from "../../test/helpers";

const ADMIN_UNREAD = "GET /api/admin/threads/unreadCount";
const NONE_UNREAD = { body: { data: { threads: 0 } } };
const ADMIN = { id: "u1", name: "Rich", email: "a@example.com", role: "admin" };
const SITE_OWNER = {
  id: "u2",
  name: "Richard Marafioti",
  email: "steviethedogchi@gmail.com",
  role: "site_owner",
};
const GALLERIES_ABILITY = {
  id: "ab2",
  kind: "galleries",
  status: "added",
  turnedOn: true,
  requestNote: null,
  requestedAt: null,
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
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

// The Navbar as the root layout renders it, with the site owner's dashboard data beside it, as
// the dashboard layout provides it.
function renderNavbar(user, { dashboard = false } = {}) {
  return render(
    <AuthContext.Provider value={{ user, setUser: vi.fn() }}>
      <NavProvider>
        <Navbar />
        {dashboard && <SiteOwnerDataProvider />}
      </NavProvider>
    </AuthContext.Provider>,
  );
}

describe("Navbar", () => {
  it("shows only Sign in and no menu when no one is signed in", () => {
    renderNavbar(null);

    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Menu" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("links the admin to Create an Account, Send a Notification, Audit Events and Messages", async () => {
    mockFetch({ [ADMIN_UNREAD]: NONE_UNREAD });

    renderNavbar(ADMIN);

    expect(
      screen.getByRole("link", { name: "Create an Account" }),
    ).toHaveAttribute("href", "/admin/createAccount");
    expect(screen.getByRole("link", { name: "Audit Events" })).toHaveAttribute(
      "href",
      "/admin/auditEvents",
    );
    expect(
      screen.getByRole("link", { name: "Send a Notification" }),
    ).toHaveAttribute("href", "/admin/notifications");
    expect(
      await screen.findByRole("link", { name: "Messages" }),
    ).toHaveAttribute("href", "/admin/messages");
  });

  it("links the site owner to Create a Post, Recently Deleted, and Create a Gallery only once a website has Photo Galleries", async () => {
    mockFetch({
      "GET /api/siteOwner/notifications/unreadCount": {
        body: { data: { updates: 0, threads: 0 } },
      },
      "GET /api/siteOwner/websites": [
        { body: { data: [WEBSITE] } },
        { body: { data: [{ ...WEBSITE, abilities: [GALLERIES_ABILITY] }] } },
      ],
    });
    const { unmount } = renderNavbar(SITE_OWNER, { dashboard: true });

    expect(screen.getByRole("link", { name: "Create a Post" })).toHaveAttribute(
      "href",
      "/dashboard?create=post",
    );
    expect(
      screen.getByRole("link", { name: "Recently Deleted" }),
    ).toHaveAttribute("href", "/dashboard/deleted");
    expect(
      screen.queryByRole("link", { name: "Create a Gallery" }),
    ).not.toBeInTheDocument();
    unmount();

    renderNavbar(SITE_OWNER, { dashboard: true });

    expect(
      await screen.findByRole("link", { name: "Create a Gallery" }),
    ).toHaveAttribute("href", "/dashboard?create=gallery");
    expect(screen.queryByRole("link", { name: "Audit Events" })).toBeNull();
  });

  it("opens the menu from the hamburger and closes it on Esc, focus back on the hamburger", async () => {
    mockFetch({ [ADMIN_UNREAD]: NONE_UNREAD });
    const user = userEvent.setup();
    renderNavbar(ADMIN);
    const menu = screen.getByRole("button", { name: "Menu" });

    await user.click(menu);

    expect(menu).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");

    expect(menu).toHaveAttribute("aria-expanded", "false");
    expect(menu).toHaveFocus();
  });

  it("closes the menu on a click outside it and on a picked link", async () => {
    mockFetch({ [ADMIN_UNREAD]: NONE_UNREAD });
    const user = userEvent.setup();
    renderNavbar(ADMIN);
    const menu = screen.getByRole("button", { name: "Menu" });

    await user.click(menu);
    await user.click(document.body);

    expect(menu).toHaveAttribute("aria-expanded", "false");

    await user.click(menu);
    await user.click(screen.getByRole("link", { name: "Audit Events" }));

    expect(menu).toHaveAttribute("aria-expanded", "false");
  });
});
