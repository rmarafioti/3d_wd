// Tests for the site owner's Messages page, through the real hooks: the merged list and its pills,
// an opened update marked read, deleting, Message Admin, and the error and empty states.

import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SiteOwnerMessagesPage from "./page";
import { NavContext } from "../../_context/NavContext";
import { mockFetch } from "../../../test/helpers";

const router = { push: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const UPDATES = "GET /api/siteOwner/notifications";
const THREADS = "GET /api/siteOwner/threads";
const DELETE_SELECTED = "POST /api/siteOwner/deleted";

const UPDATE = {
  id: "n1",
  title: "Your posts are now live!",
  body: "Your posts now show on Stevie The Dog.",
  kind: "automatic",
  createdAt: "2026-11-05T12:00:00.000Z",
  updatedAt: "2026-11-05T12:00:00.000Z",
  readAt: null,
};
const THREAD = {
  id: "t1",
  subject: "A question",
  lastMessageAt: "2026-11-06T12:00:00.000Z",
  createdAt: "2026-11-06T12:00:00.000Z",
  unread: true,
};

function list(data, nextCursor = null) {
  return { body: { data, nextCursor } };
}

function renderPage(refreshUnread = vi.fn()) {
  render(
    <NavContext.Provider value={{ refreshUnread }}>
      <SiteOwnerMessagesPage />
    </NavContext.Provider>,
  );
}

describe("Site owner Messages page", () => {
  it("lists updates and threads together, newest first, each with its pill", async () => {
    mockFetch({ [UPDATES]: list([UPDATE]), [THREADS]: list([THREAD]) });

    renderPage();

    const items = within(await screen.findByRole("list")).getAllByRole(
      "listitem",
    );
    expect(items[0]).toHaveTextContent("messageA question");
    expect(items[1]).toHaveTextContent("updateYour posts are now live!");
    expect(
      within(items[0]).getByRole("link", { name: /A question/ }),
    ).toHaveAttribute("href", "/dashboard/messages/t1");
  });

  it("marks unread updates and threads with an unread pill, and read ones with none", async () => {
    mockFetch({
      [UPDATES]: list([
        UPDATE,
        {
          ...UPDATE,
          id: "n2",
          title: "Read update",
          readAt: "2026-11-05T13:00:00.000Z",
        },
      ]),
      [THREADS]: list([
        THREAD,
        {
          ...THREAD,
          id: "t2",
          subject: "Read thread",
          lastMessageAt: "2026-11-04T12:00:00.000Z",
          unread: false,
        },
      ]),
    });

    renderPage();

    const items = within(await screen.findByRole("list")).getAllByRole(
      "listitem",
    );
    const unreadOf = (title) =>
      within(
        items.find((item) => item.textContent.includes(title)),
      ).queryByText("unread");
    expect(unreadOf("A question")).toBeInTheDocument();
    expect(unreadOf("Your posts are now live!")).toBeInTheDocument();
    expect(unreadOf("Read thread")).not.toBeInTheDocument();
    expect(unreadOf("Read update")).not.toBeInTheDocument();
  });

  it("marks an unread update read the first time it is opened, then refreshes the badge", async () => {
    const refreshUnread = vi.fn();
    const { calls } = mockFetch({
      [UPDATES]: list([UPDATE]),
      [THREADS]: list([]),
      "POST /api/siteOwner/notifications/n1/read": {
        body: { data: { ...UPDATE, readAt: "2026-11-06T13:00:00.000Z" } },
      },
    });
    const user = userEvent.setup();
    renderPage(refreshUnread);

    await user.click(await screen.findByText("Your posts are now live!"));

    expect(
      screen.getByText("Your posts now show on Stevie The Dog."),
    ).toBeVisible();
    await waitFor(() => expect(refreshUnread).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("unread")).not.toBeInTheDocument();
    expect(calls.filter((call) => call.method === "POST")).toHaveLength(1);
  });

  it("starts a thread from Message Admin and goes to it", async () => {
    const { calls } = mockFetch({
      [UPDATES]: list([]),
      [THREADS]: list([]),
      "POST /api/siteOwner/threads": {
        status: 201,
        body: { data: { ...THREAD, id: "t2", unread: false, messages: [] } },
      },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole("button", { name: "Message Admin" }),
    );
    const dialog = within(
      screen.getByRole("dialog", { name: "Message Admin" }),
    );
    await user.type(dialog.getByLabelText("Subject"), "A question");
    await user.type(dialog.getByLabelText("Message"), "Can we add a page?");
    await user.click(dialog.getByRole("button", { name: "Send" }));

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith("/dashboard/messages/t2"),
    );
    expect(calls.find((call) => call.method === "POST").body).toEqual({
      subject: "A question",
      message: "Can we add a page?",
    });
  });

  it("shows a rate limit's message in the dialog", async () => {
    mockFetch({
      [UPDATES]: list([]),
      [THREADS]: list([]),
      "POST /api/siteOwner/threads": {
        status: 429,
        body: {
          error: { message: "Too many requests. Please try again later." },
        },
      },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole("button", { name: "Message Admin" }),
    );
    const dialog = within(screen.getByRole("dialog"));
    await user.type(dialog.getByLabelText("Subject"), "Hi");
    await user.type(dialog.getByLabelText("Message"), "Hello");
    await user.click(dialog.getByRole("button", { name: "Send" }));

    expect(
      await dialog.findByText("Too many requests. Please try again later."),
    ).toBeInTheDocument();
  });

  it("says so when there is nothing in the mailbox", async () => {
    mockFetch({ [UPDATES]: list([]), [THREADS]: list([]) });

    renderPage();

    expect(await screen.findByText("No messages yet.")).toBeInTheDocument();
  });

  it("shows the API's message in place of the list when either list can't load", async () => {
    mockFetch({
      [UPDATES]: list([UPDATE]),
      [THREADS]: {
        status: 500,
        body: {
          error: { message: "Something went wrong, please try again." },
        },
      },
    });

    renderPage();

    expect(
      await screen.findByText("Something went wrong, please try again."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Your posts are now live!"),
    ).not.toBeInTheDocument();
  });
  it("deletes one ticked item with no confirmation, then fetches the mailbox and the badge again", async () => {
    const refreshUnread = vi.fn();
    const { calls } = mockFetch({
      [UPDATES]: [list([UPDATE]), list([])],
      [THREADS]: [list([]), list([])],
      [DELETE_SELECTED]: {
        body: { data: { deleted: [{ type: "update", id: "n1" }], failed: [] } },
      },
    });
    const user = userEvent.setup();
    renderPage(refreshUnread);

    await user.click(
      await screen.findByRole("checkbox", {
        name: "Select Your posts are now live!",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("No messages yet.")).toBeInTheDocument();
    const del = calls.find((call) => call.method === "POST");
    expect(del.path).toBe("/api/siteOwner/deleted");
    expect(del.headers["X-CSRF-Protection"]).toBe("1");
    expect(del.body).toEqual({ items: [{ type: "update", id: "n1" }] });
    expect(refreshUnread).toHaveBeenCalled();
  });

  it("confirms before deleting two or more, sending a thread as a thread", async () => {
    const { calls } = mockFetch({
      [UPDATES]: [list([UPDATE]), list([])],
      [THREADS]: [list([THREAD]), list([])],
      [DELETE_SELECTED]: {
        body: {
          data: {
            deleted: [
              { type: "thread", id: "t1" },
              { type: "update", id: "n1" },
            ],
            failed: [],
          },
        },
      },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole("checkbox", { name: "Select all" }),
    );
    await user.click(screen.getByRole("button", { name: "Delete" }));
    const confirm = within(screen.getByRole("dialog"));
    expect(
      confirm.getByText("Delete 2 messages? You can restore them for 30 days."),
    ).toBeInTheDocument();
    await user.click(confirm.getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("No messages yet.")).toBeInTheDocument();
    expect(calls.find((call) => call.method === "POST").body).toEqual({
      items: [
        { type: "thread", id: "t1" },
        { type: "update", id: "n1" },
      ],
    });
  });

  it("sends nothing when deleting several is cancelled", async () => {
    const { calls } = mockFetch({
      [UPDATES]: list([UPDATE]),
      [THREADS]: list([THREAD]),
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole("checkbox", { name: "Select all" }),
    );
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(calls.filter((call) => call.method !== "GET")).toHaveLength(0);
  });

  it("keeps Delete disabled until something is ticked", async () => {
    mockFetch({ [UPDATES]: list([UPDATE]), [THREADS]: list([]) });

    renderPage();

    expect(
      await screen.findByRole("button", { name: "Delete" }),
    ).toBeDisabled();
  });

  it("names an item that couldn't be deleted", async () => {
    mockFetch({
      [UPDATES]: list([]),
      [THREADS]: [list([THREAD]), list([])],
      [DELETE_SELECTED]: {
        body: {
          data: {
            deleted: [],
            failed: [
              { type: "thread", id: "t1", message: "Thread not found." },
            ],
          },
        },
      },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole("checkbox", { name: "Select A question" }),
    );
    await user.click(screen.getByRole("button", { name: "Delete" }));

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText(
        "Couldn't delete: A question (Thread not found.)",
      ),
    ).toBeInTheDocument();
  });

  it("offers Select all and Delete only while the mailbox has items", async () => {
    mockFetch({ [UPDATES]: list([]), [THREADS]: list([]) });

    renderPage();

    await screen.findByText("No messages yet.");
    expect(
      screen.queryByRole("checkbox", { name: "Select all" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Delete" }),
    ).not.toBeInTheDocument();
  });
});
