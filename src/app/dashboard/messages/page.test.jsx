// Tests for the site owner's Messages page, through the real hooks and apiFetch: the merged list
// with its pills, opening an unread update marking it read, Message Admin, and the error and empty states.

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
    expect(items[0]).toHaveTextContent("messageA question (unread)");
    expect(items[1]).toHaveTextContent("updateYour posts are now live!");
    expect(
      within(items[0]).getByRole("link", { name: /A question/ }),
    ).toHaveAttribute("href", "/dashboard/messages/t1");
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
    expect(screen.queryByText("(unread)")).not.toBeInTheDocument();
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
});
