// Tests for the admin's Messages page, through the real hooks: sent updates and threads in one list,
// the read tally, Edit, Withdraw, ticking and deleting, Load more, and the error and empty states.

import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminMessagesPage from "./page";
import { mockFetch } from "../../../test/helpers";

const UPDATES = "GET /api/admin/notifications";
const THREADS = "GET /api/admin/threads";

function sent(id, overrides = {}) {
  return {
    id,
    title: `Update ${id}`,
    body: "Hello from 3D Web Dev.",
    kind: "general",
    createdAt: "2026-11-05T12:00:00.000Z",
    updatedAt: "2026-11-05T12:00:00.000Z",
    recipientCount: 3,
    readCount: 2,
    ...overrides,
  };
}

function thread(id, unread) {
  return {
    id,
    subject: `Thread ${id}`,
    lastMessageAt: "2026-11-06T12:00:00.000Z",
    createdAt: "2026-11-06T12:00:00.000Z",
    unread,
    account: { id: "a1", name: "Richard Marafioti" },
  };
}

function list(data, nextCursor = null) {
  return { body: { data, nextCursor } };
}

async function rows() {
  return within(await screen.findByRole("list")).getAllByRole("listitem");
}

describe("Admin Messages page", () => {
  it("lists sent updates with their read tally beside threads, newest first", async () => {
    mockFetch({
      [UPDATES]: list([sent("n1")]),
      [THREADS]: list([thread("t1", true)]),
    });

    render(<AdminMessagesPage />);

    const [first, second] = await rows();
    expect(
      within(first).getByRole("link", { name: "Thread t1" }),
    ).toHaveAttribute("href", "/admin/messages/t1");
    expect(first).toHaveTextContent("message");
    expect(first).toHaveTextContent("Richard Marafioti");
    expect(first).toHaveTextContent("unread");
    expect(second).toHaveTextContent("update");
    expect(second).toHaveTextContent("Update n1");
    expect(second).toHaveTextContent("Read by 2 of 3");
  });

  it("edits an update and fetches the mailbox again", async () => {
    const { calls } = mockFetch({
      [UPDATES]: [
        list([sent("n1")]),
        list([sent("n1", { title: "New title" })]),
      ],
      [THREADS]: list([]),
      "PATCH /api/admin/notifications/n1": {
        body: { data: sent("n1", { title: "New title" }) },
      },
    });
    const user = userEvent.setup();
    render(<AdminMessagesPage />);

    await user.click(
      await screen.findByRole("button", { name: "Actions for Update n1" }),
    );
    await user.click(screen.getByRole("button", { name: "Edit" }));
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByRole("button", { name: "Save" })).toBeDisabled();
    await user.clear(dialog.getByLabelText("Title"));
    await user.type(dialog.getByLabelText("Title"), "New title");
    await user.click(dialog.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("New title")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(calls.find((call) => call.method === "PATCH").body).toEqual({
      title: "New title",
      body: "Hello from 3D Web Dev.",
    });
  });

  it("withdraws an update only once confirmed", async () => {
    const { calls } = mockFetch({
      [UPDATES]: [list([sent("n1")]), list([])],
      [THREADS]: list([]),
      "DELETE /api/admin/notifications/n1": { status: 204 },
    });
    const user = userEvent.setup();
    render(<AdminMessagesPage />);

    await user.click(
      await screen.findByRole("button", { name: "Actions for Update n1" }),
    );
    await user.click(screen.getByRole("button", { name: "Withdraw" }));
    const confirm = within(screen.getByRole("dialog"));
    expect(
      confirm.getByText(
        'Withdraw "Update n1"? It will be removed from every mailbox.',
      ),
    ).toBeInTheDocument();
    await user.click(confirm.getByRole("button", { name: "Withdraw" }));

    expect(await screen.findByText("No messages yet.")).toBeInTheDocument();
    expect(calls.filter((call) => call.method === "DELETE")).toHaveLength(1);
  });

  it("shows a failed Withdraw's message in a dialog and keeps the update listed", async () => {
    mockFetch({
      [UPDATES]: list([sent("n1")]),
      [THREADS]: list([]),
      "DELETE /api/admin/notifications/n1": {
        status: 404,
        body: { error: { message: "Update not found." } },
      },
    });
    const user = userEvent.setup();
    render(<AdminMessagesPage />);
    await user.click(
      await screen.findByRole("button", { name: "Actions for Update n1" }),
    );
    await user.click(screen.getByRole("button", { name: "Withdraw" }));

    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Withdraw",
      }),
    );

    expect(await screen.findByRole("dialog")).toHaveTextContent(
      "Update not found.",
    );
    expect(
      screen.getByRole("button", { name: "Actions for Update n1" }),
    ).toBeInTheDocument();
  });

  it("appends the next page with Load more until nextCursor is null", async () => {
    mockFetch({
      [UPDATES]: list([]),
      [THREADS]: list([thread("t1", false)], "t1"),
      [`${THREADS}?cursor=t1`]: list([thread("t2", false)]),
    });
    const user = userEvent.setup();
    render(<AdminMessagesPage />);

    await user.click(await screen.findByRole("button", { name: "Load more" }));

    expect(
      await screen.findByRole("link", { name: "Thread t2" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Load more" }),
    ).not.toBeInTheDocument();
  });

  it("shows the API's message in place of the list when it can't load", async () => {
    mockFetch({
      [UPDATES]: list([]),
      [THREADS]: {
        status: 500,
        body: {
          error: { message: "Something went wrong, please try again." },
        },
      },
    });

    render(<AdminMessagesPage />);

    expect(
      await screen.findByText("Something went wrong, please try again."),
    ).toBeInTheDocument();
  });

  it("says so when nothing has been sent or received", async () => {
    mockFetch({ [UPDATES]: list([]), [THREADS]: list([]) });

    render(<AdminMessagesPage />);

    expect(await screen.findByText("No messages yet.")).toBeInTheDocument();
  });
  it("deletes a ticked sent update from the admin's mailbox only, never withdrawing it", async () => {
    const { calls } = mockFetch({
      [UPDATES]: [list([sent("n1")]), list([])],
      [THREADS]: list([]),
      "POST /api/admin/deleted": {
        body: { data: { deleted: [{ type: "update", id: "n1" }], failed: [] } },
      },
    });
    const user = userEvent.setup();
    render(<AdminMessagesPage />);

    await user.click(
      await screen.findByRole("checkbox", { name: "Select Update n1" }),
    );
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("No messages yet.")).toBeInTheDocument();
    expect(calls.find((call) => call.method === "POST").body).toEqual({
      items: [{ type: "update", id: "n1" }],
    });
    expect(calls.filter((call) => call.method === "DELETE")).toHaveLength(0);
  });

  it("offers only Edit and Withdraw in a sent update's ⋮, and no ⋮ on a thread", async () => {
    mockFetch({
      [UPDATES]: list([sent("n1")]),
      [THREADS]: list([thread("t1", false)]),
    });
    const user = userEvent.setup();
    render(<AdminMessagesPage />);

    await user.click(
      await screen.findByRole("button", { name: "Actions for Update n1" }),
    );

    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Withdraw" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Actions for Thread t1" }),
    ).not.toBeInTheDocument();
  });
});
