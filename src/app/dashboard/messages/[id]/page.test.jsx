// Tests for the thread page and ThreadView, through the real hooks: marking it read, the sent or
// received arrows, the Reply dialog and the return to the dashboard, a full thread, a missing one.

import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SiteOwnerThreadPage from "./page";
import { NavContext } from "../../../_context/NavContext";
import { mockFetch } from "../../../../test/helpers";

const router = { push: vi.fn() };
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useParams: () => ({ id: "t1" }),
}));

const GET = "GET /api/siteOwner/threads/t1";
const READ = "POST /api/siteOwner/threads/t1/read";
const REPLY = "POST /api/siteOwner/threads/t1/messages";

const FIRST = {
  id: "m1",
  from: "admin",
  authorName: "Rich",
  body: "Your gallery is **ready**.",
  createdAt: "2026-11-06T12:00:00.000Z",
};
const THREAD = {
  id: "t1",
  subject: "Your gallery",
  lastMessageAt: FIRST.createdAt,
  createdAt: FIRST.createdAt,
  unread: true,
  messages: [FIRST],
};
const SUMMARY = { body: { data: { ...THREAD, messages: undefined } } };

function renderPage(refreshUnread = vi.fn()) {
  render(
    <NavContext.Provider value={{ refreshUnread }}>
      <SiteOwnerThreadPage />
    </NavContext.Provider>,
  );
}

// Opens the Reply dialog, types the reply and sends it.
async function typeReply(user, text) {
  await user.click(await screen.findByRole("button", { name: "Reply" }));
  const dialog = within(
    screen.getByRole("dialog", { name: "Reply to Your gallery" }),
  );
  await user.type(dialog.getByLabelText("Message"), text);
  await user.click(dialog.getByRole("button", { name: "Send reply" }));
}

describe("Site owner thread page", () => {
  it("shows the messages and marks the thread read, then refreshes the badge", async () => {
    const refreshUnread = vi.fn();
    const { calls } = mockFetch({
      [GET]: { body: { data: THREAD } },
      [READ]: SUMMARY,
    });

    renderPage(refreshUnread);

    expect(
      await screen.findByRole("heading", { name: "Your gallery" }),
    ).toBeInTheDocument();
    expect(screen.getByText("ready").tagName).toBe("B");
    await waitFor(() => expect(refreshUnread).toHaveBeenCalledTimes(1));
    expect(calls.filter((call) => call.path.endsWith("/read"))).toHaveLength(1);
  });

  it("marks each message sent or received from the viewer's side", async () => {
    const own = {
      id: "m2",
      from: "site_owner",
      authorName: "Richard Marafioti",
      body: "Thank you!",
      createdAt: "2026-11-06T13:00:00.000Z",
    };
    mockFetch({
      [GET]: { body: { data: { ...THREAD, messages: [FIRST, own] } } },
      [READ]: SUMMARY,
    });

    renderPage();

    const [first, second] = within(
      await screen.findByRole("list"),
    ).getAllByRole("listitem");
    // The admin wrote the first, so for the site owner it came in.
    expect(
      within(first).getByRole("img", { name: "Received" }),
    ).toBeInTheDocument();
    expect(
      within(second).getByRole("img", { name: "Sent" }),
    ).toBeInTheDocument();
  });

  it("shows the thread without a reply form until Reply is pressed", async () => {
    mockFetch({ [GET]: { body: { data: THREAD } }, [READ]: SUMMARY });

    renderPage();

    expect(
      await screen.findByRole("button", { name: "Reply" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Message")).not.toBeInTheDocument();
  });

  it("sends a reply from its dialog, then goes straight back to the dashboard", async () => {
    const { calls } = mockFetch({
      [GET]: { body: { data: THREAD } },
      [READ]: SUMMARY,
      [REPLY]: { status: 201, body: { data: THREAD } },
    });
    const user = userEvent.setup();
    renderPage();

    await typeReply(user, "  Thank you! ");

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/dashboard"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(calls.find((call) => call.path.endsWith("/messages")).body).toEqual({
      message: "Thank you!",
    });
  });

  it("offers a new thread when this one is full", async () => {
    mockFetch({
      [GET]: { body: { data: THREAD } },
      [READ]: SUMMARY,
      [REPLY]: {
        status: 409,
        body: {
          error: { message: "This thread is full. Start a new thread." },
        },
      },
    });
    const user = userEvent.setup();
    renderPage();

    await typeReply(user, "One more");
    expect(
      await screen.findByText("This thread is full. Start a new thread."),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Start a new thread" }),
    );

    expect(
      screen.getByRole("dialog", { name: "Message Admin" }),
    ).toBeInTheDocument();
    // The Reply dialog gives way to the new thread's.
    expect(
      screen.queryByRole("dialog", { name: "Reply to Your gallery" }),
    ).not.toBeInTheDocument();
  });

  it("shows a missing thread's message in place of the thread", async () => {
    const missing = {
      status: 404,
      body: { error: { message: "Thread not found." } },
    };
    mockFetch({ [GET]: missing, [READ]: missing });

    renderPage();

    expect(await screen.findByText("Thread not found.")).toBeInTheDocument();
    expect(
      within(document.body).queryByRole("button", { name: "Send reply" }),
    ).not.toBeInTheDocument();
  });
});
