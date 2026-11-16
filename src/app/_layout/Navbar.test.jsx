// Tests for Navbar: the signed-out row, the landing page's section links, each role's
// links (Create a Gallery through NavContext) and the phone menu's opening and closing.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Navbar from "./Navbar";
import { AuthContext } from "../_context/AuthContext";
import { NavProvider } from "../_context/NavContext";
import { SiteOwnerDataProvider } from "../_context/SiteOwnerDataContext";
import { mockFetch } from "../../test/helpers";

const navigation = vi.hoisted(() => ({ pathname: "/admin" }));
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

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
// the dashboard layout provides it, or the landing page's linked sections under it.
function renderNavbar(user, { dashboard = false, landing = false } = {}) {
  return render(
    <AuthContext.Provider value={{ user, setUser: vi.fn() }}>
      <NavProvider>
        <Navbar />
        {dashboard && <SiteOwnerDataProvider />}
        {landing && (
          <>
            <section id="pricing">
              <h2 tabIndex={-1}>Pricing made simple.</h2>
            </section>
            <section id="about">
              <h2 tabIndex={-1}>From experience, I know where the hours go.</h2>
            </section>
            <section id="contact">
              <h2 tabIndex={-1}>
                Let&apos;s make your website do more of the work.
              </h2>
            </section>
          </>
        )}
      </NavProvider>
    </AuthContext.Provider>,
  );
}

describe("Navbar", () => {
  beforeEach(() => {
    navigation.pathname = "/admin";
  });

  it("shows only Sign in and no menu before a dashboard's user has loaded", () => {
    navigation.pathname = "/dashboard";

    renderNavbar(null);

    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Menu" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("links the landing page's sections in order, with Sign in kept in the top row", () => {
    navigation.pathname = "/";

    renderNavbar(null, { landing: true });

    const links = within(screen.getByRole("list")).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "Pricing",
      "About Me",
      "Contact Me",
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "#pricing",
      "#about",
      "#contact",
    ]);
    expect(
      within(screen.getByRole("list")).queryByRole("link", { name: "Sign in" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Menu" })).toBeInTheDocument();
  });

  it("links the sign-in page's section links to the landing page's sections, with the hamburger", () => {
    navigation.pathname = "/sign-in";

    renderNavbar(null);

    const links = within(screen.getByRole("list")).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/#pricing",
      "/#about",
      "/#contact",
    ]);
    expect(screen.getByRole("button", { name: "Menu" })).toBeInTheDocument();
  });

  it("closes the menu and moves focus to the section's heading when a section link is picked", async () => {
    navigation.pathname = "/";
    const user = userEvent.setup();
    renderNavbar(null, { landing: true });
    const menu = screen.getByRole("button", { name: "Menu" });

    await user.click(menu);
    await user.click(screen.getByRole("link", { name: "Pricing" }));

    expect(menu).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.getByRole("heading", { name: "Pricing made simple." }),
    ).toHaveFocus();
  });

  it("links the admin to Create an Account, Send a Notification, Audit Events, Messages and Recently Deleted", async () => {
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
    expect(
      screen.getByRole("link", { name: "Recently Deleted" }),
    ).toHaveAttribute("href", "/admin/deleted");
  });

  it("links the site owner to Create a Post, and Create a Gallery only once a website has Photo Galleries, with Recently Deleted as the trash icon outside the links", async () => {
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
      within(screen.getByRole("list")).queryByRole("link", {
        name: "Recently Deleted",
      }),
    ).not.toBeInTheDocument();
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
