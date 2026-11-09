// Tests for the admin's Recently Deleted page, through the real hooks: the admin's own list, and
// restoring the ticked mail through the admin's bulk route, then back to /admin.

import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminRecentlyDeletedPage from "./page";
import { mockFetch } from "../../../test/helpers";

const router = { push: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const DELETED = "GET /api/admin/deleted";

function deletedMail(type, id) {
  return {
    type,
    id,
    name: `${type} ${id}`,
    websiteId: null,
    websiteName: null,
    deletedAt: "2026-11-04T12:00:00.000Z",
    restorableUntil: "2026-12-04T12:00:00.000Z",
  };
}

function list(data, nextCursor = null) {
  return { body: { data, nextCursor } };
}

describe("Admin Recently Deleted page", () => {
  it("lists the admin's deleted mail with no Website column", async () => {
    mockFetch({
      [DELETED]: list([
        deletedMail("update", "n1"),
        deletedMail("thread", "t1"),
      ]),
    });

    render(<AdminRecentlyDeletedPage />);

    expect(await screen.findByText("update n1")).toBeInTheDocument();
    expect(screen.getByText("thread t1")).toBeInTheDocument();
    expect(
      screen.getByText("Deleted messages can be restored for 30 days."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Website" }),
    ).not.toBeInTheDocument();
  });

  it("restores the ticked mail through the admin's bulk route, then goes back to /admin", async () => {
    const { calls } = mockFetch({
      [DELETED]: list([
        deletedMail("update", "n1"),
        deletedMail("thread", "t1"),
      ]),
      "POST /api/admin/deleted/restore": {
        body: {
          data: {
            restored: [
              { type: "update", id: "n1" },
              { type: "thread", id: "t1" },
            ],
            failed: [],
          },
        },
      },
    });
    const user = userEvent.setup();
    render(<AdminRecentlyDeletedPage />);

    await user.click(
      await screen.findByRole("checkbox", { name: "Select all" }),
    );
    await user.click(screen.getByRole("button", { name: "Restore" }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/admin"));
    expect(calls.find((call) => call.method === "POST").body).toEqual({
      items: [
        { type: "update", id: "n1" },
        { type: "thread", id: "t1" },
      ],
    });
  });
});
