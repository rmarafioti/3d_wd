// Tests for MailLink: each role's unread count in its name (its badge is a plain dot), plain
// "Messages" at 0, and the count fetched again on a page change and when a page marks something read.

import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MailLink from "./MailLink";
import { NavProvider } from "../_context/NavContext";
import { useNav } from "../_hooks/useNav";
import { mockFetch } from "../../test/helpers";

let pathname = "/dashboard";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

const ADMIN_COUNT = "GET /api/admin/threads/unreadCount";
const OWNER_COUNT = "GET /api/siteOwner/notifications/unreadCount";

// Stands in for a page that marks something read.
function MarkReadButton() {
  const { refreshUnread } = useNav();
  return (
    <button type="button" onClick={refreshUnread}>
      Mark read
    </button>
  );
}

function renderMailLink(role) {
  return render(
    <NavProvider>
      <MailLink role={role} />
      <MarkReadButton />
    </NavProvider>,
  );
}

describe("MailLink", () => {
  it("counts the site owner's unread updates and threads together", async () => {
    mockFetch({
      [OWNER_COUNT]: { body: { data: { updates: 2, threads: 1 } } },
    });

    renderMailLink("site_owner");

    expect(
      await screen.findByRole("link", { name: "Messages, 3 unread" }),
    ).toHaveAttribute("href", "/dashboard/messages");
  });

  it("counts the admin's unread threads", async () => {
    mockFetch({ [ADMIN_COUNT]: { body: { data: { threads: 4 } } } });

    renderMailLink("admin");

    expect(
      await screen.findByRole("link", { name: "Messages, 4 unread" }),
    ).toHaveAttribute("href", "/admin/messages");
  });

  it("reads as plain Messages when nothing is unread", async () => {
    const { calls } = mockFetch({
      [ADMIN_COUNT]: { body: { data: { threads: 0 } } },
    });

    renderMailLink("admin");
    await waitFor(() => expect(calls).toHaveLength(1));

    expect(screen.getByRole("link", { name: "Messages" })).toBeInTheDocument();
  });

  it("fetches the count again when a page marks something read", async () => {
    mockFetch({
      [ADMIN_COUNT]: [
        { body: { data: { threads: 1 } } },
        { body: { data: { threads: 0 } } },
      ],
    });
    const user = userEvent.setup();
    renderMailLink("admin");
    await screen.findByRole("link", { name: "Messages, 1 unread" });

    await user.click(screen.getByRole("button", { name: "Mark read" }));

    expect(
      await screen.findByRole("link", { name: "Messages" }),
    ).toBeInTheDocument();
  });

  it("fetches the count again on a page change", async () => {
    const { calls } = mockFetch({
      [ADMIN_COUNT]: { body: { data: { threads: 0 } } },
    });
    const { rerender } = renderMailLink("admin");
    await waitFor(() => expect(calls).toHaveLength(1));

    pathname = "/admin/auditEvents";
    rerender(
      <NavProvider>
        <MailLink role="admin" />
        <MarkReadButton />
      </NavProvider>,
    );

    await waitFor(() => expect(calls).toHaveLength(2));
  });
});
