// Tests for the Recently Deleted page, through the real hooks and apiFetch: the rows and their days
// left, the Website column, Restore and its refetches, a refused restore, the states and Load more.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RecentlyDeletedPage from "./page";
import { SiteOwnerDataProvider } from "../../_context/SiteOwnerDataContext";
import { mockFetch } from "../../../test/helpers";

const DELETED = "GET /api/siteOwner/posts/deleted";
const WEBSITES = "GET /api/siteOwner/websites";
const RESTORE = "POST /api/siteOwner/posts/p1/restore";

const WEBSITE = {
  id: "w1",
  websiteName: "Stevie The Dog",
  url: "https://www.steviethedog.com",
  active: true,
  abilities: [],
  posts: [],
  galleries: [],
};

function deletedPost(id, overrides = {}) {
  return {
    id,
    websiteId: "w1",
    websiteName: "Stevie The Dog",
    postName: `Post ${id}`,
    postDate: null,
    status: "published",
    deletedAt: "2026-11-04T12:00:00.000Z",
    restorableUntil: "2026-12-04T12:00:00.000Z",
    ...overrides,
  };
}

function list(data, nextCursor = null) {
  return { body: { data, nextCursor } };
}

// The page reads the websites the dashboard layout fetches for it.
function renderPage() {
  return render(
    <SiteOwnerDataProvider>
      <RecentlyDeletedPage />
    </SiteOwnerDataProvider>,
  );
}

function bodyRows() {
  return screen.getAllByRole("row").slice(1);
}

describe("Recently Deleted page", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ["Date"],
      now: new Date("2026-11-05T12:00:00Z"),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lists each deleted post with its status and the days left from restorableUntil", async () => {
    mockFetch({
      [WEBSITES]: { body: { data: [WEBSITE] } },
      [DELETED]: list([
        deletedPost("p1"),
        deletedPost("p2", {
          status: "draft",
          restorableUntil: "2026-11-06T06:00:00.000Z",
        }),
      ]),
    });

    renderPage();

    await screen.findByText("Post p1");
    const [first, second] = bodyRows();
    expect(within(first).getByText("published")).toBeInTheDocument();
    expect(within(first).getByText("29 days")).toBeInTheDocument();
    expect(within(second).getByText("draft")).toBeInTheDocument();
    expect(within(second).getByText("1 day")).toBeInTheDocument();
  });

  it("shows the Website column only for an account with more than one website", async () => {
    mockFetch({
      [WEBSITES]: [
        { body: { data: [WEBSITE] } },
        { body: { data: [WEBSITE, { ...WEBSITE, id: "w2" }] } },
      ],
      [DELETED]: list([deletedPost("p1")]),
    });
    const { unmount } = renderPage();

    await screen.findByText("Post p1");
    await waitFor(() =>
      expect(
        screen.queryByRole("columnheader", { name: "Website" }),
      ).not.toBeInTheDocument(),
    );
    unmount();
    renderPage();

    expect(
      await screen.findByRole("columnheader", { name: "Website" }),
    ).toBeInTheDocument();
  });

  it("restores a post with the CSRF header, then refetches the list from the start and the websites", async () => {
    const { calls } = mockFetch({
      [WEBSITES]: { body: { data: [WEBSITE] } },
      [DELETED]: [list([deletedPost("p1")]), list([])],
      [RESTORE]: { body: { data: { id: "p1" } } },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole("button", { name: "Restore Post p1" }),
    );

    expect(
      await screen.findByText("No recently deleted posts."),
    ).toBeInTheDocument();
    const restore = calls.find((call) => call.method === "POST");
    expect(restore.path).toBe("/api/siteOwner/posts/p1/restore");
    expect(restore.headers["X-CSRF-Protection"]).toBe("1");
    expect(restore.credentials).toBe("include");
    expect(calls.filter((call) => `GET ${call.path}` === DELETED)).toHaveLength(
      2,
    );
    expect(
      calls.filter((call) => `GET ${call.path}` === WEBSITES),
    ).toHaveLength(2);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the API's message when a restore is refused, and refetches the list", async () => {
    const { calls } = mockFetch({
      [WEBSITES]: { body: { data: [WEBSITE] } },
      [DELETED]: [list([deletedPost("p1")]), list([])],
      [RESTORE]: {
        status: 404,
        body: { error: { message: "Post not found." } },
      },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole("button", { name: "Restore Post p1" }),
    );

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Post not found.")).toBeInTheDocument();
    await screen.findByText("No recently deleted posts.");
    expect(
      calls.filter((call) => `GET ${call.path}` === WEBSITES),
    ).toHaveLength(1);
  });

  it("shows the API's message when the list can't load", async () => {
    mockFetch({
      [WEBSITES]: { body: { data: [WEBSITE] } },
      [DELETED]: {
        status: 500,
        body: { error: { message: "Something went wrong, please try again." } },
      },
    });

    renderPage();

    expect(
      await screen.findByText("Something went wrong, please try again."),
    ).toBeInTheDocument();
  });

  it("keeps the rows and shows the message when Load more fails", async () => {
    mockFetch({
      [WEBSITES]: { body: { data: [WEBSITE] } },
      [DELETED]: list([deletedPost("p2")], "p2"),
      [`${DELETED}?cursor=p2`]: {
        status: 500,
        body: { error: { message: "Something went wrong, please try again." } },
      },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Load more" }));

    expect(
      await screen.findByText("Something went wrong, please try again."),
    ).toBeInTheDocument();
    expect(bodyRows()).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Load more" })).toBeEnabled();
  });

  it("appends the next page with Load more, offered only while nextCursor isn't null", async () => {
    const { calls } = mockFetch({
      [WEBSITES]: { body: { data: [WEBSITE] } },
      [DELETED]: list([deletedPost("p2")], "p2"),
      [`${DELETED}?cursor=p2`]: list([deletedPost("p1")]),
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Load more" }));

    await screen.findByText("Post p1");
    expect(bodyRows()).toHaveLength(2);
    expect(calls.map((call) => call.path)).toContain(
      "/api/siteOwner/posts/deleted?cursor=p2",
    );
    expect(
      screen.queryByRole("button", { name: "Load more" }),
    ).not.toBeInTheDocument();
  });
});
