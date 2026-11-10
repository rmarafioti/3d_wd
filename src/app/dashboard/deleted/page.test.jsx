// Tests for the site owner's Recently Deleted page, through the real hooks: each row's pill, days
// left and website, restoring together and back to the dashboard, a partial restore, the states.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RecentlyDeletedPage from "./page";
import { SiteOwnerDataProvider } from "../../_context/SiteOwnerDataContext";
import { mockFetch } from "../../../test/helpers";

const router = { push: vi.fn() };
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/dashboard/deleted",
}));

const DELETED = "GET /api/siteOwner/deleted";
const WEBSITES = "GET /api/siteOwner/websites";
const RESTORE = "POST /api/siteOwner/deleted/restore";

const WEBSITE = {
  id: "w1",
  websiteName: "Stevie The Dog",
  url: "https://www.steviethedog.com",
  active: true,
  abilities: [],
  posts: [],
  galleries: [],
};

// A DeletedItem (docs/api.md → Shapes): websiteId and websiteName are null for mail.
function deletedItem(type, id, overrides = {}) {
  const isMail = type === "update" || type === "thread";
  return {
    type,
    id,
    name: `${type} ${id}`,
    websiteId: isMail ? null : "w1",
    websiteName: isMail ? null : "Stevie The Dog",
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

function websiteFetches(calls) {
  return calls.filter((call) => `GET ${call.path}` === WEBSITES);
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

  it("lists posts, galleries, updates and threads, each with its type and the days left from restorableUntil", async () => {
    mockFetch({
      [WEBSITES]: { body: { data: [WEBSITE] } },
      [DELETED]: list([
        deletedItem("post", "p1"),
        deletedItem("gallery", "g1"),
        deletedItem("update", "n1"),
        deletedItem("thread", "t1", {
          restorableUntil: "2026-11-06T06:00:00.000Z",
        }),
      ]),
    });

    renderPage();

    await screen.findByText("post p1");
    const [post, gallery, update, thread] = bodyRows();
    expect(within(post).getByText("post")).toBeInTheDocument();
    expect(within(post).getByText("29 days")).toBeInTheDocument();
    expect(within(gallery).getByText("gallery")).toBeInTheDocument();
    expect(within(update).getByText("update")).toBeInTheDocument();
    expect(within(thread).getByText("message")).toBeInTheDocument();
    expect(within(thread).getByText("1 day")).toBeInTheDocument();
  });

  it("shows the Website column only for an account with more than one website, empty for mail", async () => {
    mockFetch({
      [WEBSITES]: [
        { body: { data: [WEBSITE] } },
        { body: { data: [WEBSITE, { ...WEBSITE, id: "w2" }] } },
      ],
      [DELETED]: list([deletedItem("post", "p1"), deletedItem("update", "n1")]),
    });
    const { unmount } = renderPage();

    await screen.findByText("post p1");
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
    const [post, update] = bodyRows();
    expect(within(post).getByText("Stevie The Dog")).toBeInTheDocument();
    expect(within(update).queryByText("Stevie The Dog")).toBeNull();
  });

  it("restores the ticked items together through the bulk route, then goes back to /dashboard", async () => {
    const { calls } = mockFetch({
      [WEBSITES]: { body: { data: [WEBSITE] } },
      [DELETED]: list([
        deletedItem("post", "p1"),
        deletedItem("gallery", "g1"),
        deletedItem("update", "n1"),
        deletedItem("thread", "t1"),
      ]),
      [RESTORE]: {
        body: {
          data: {
            restored: [
              { type: "post", id: "p1" },
              { type: "thread", id: "t1" },
            ],
            failed: [],
          },
        },
      },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole("checkbox", { name: "Select post p1" }),
    );
    await user.click(
      screen.getByRole("checkbox", { name: "Select thread t1" }),
    );
    await user.click(screen.getByRole("button", { name: "Restore" }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/dashboard"));
    const restore = calls.find((call) => call.method === "POST");
    expect(restore.path).toBe("/api/siteOwner/deleted/restore");
    expect(restore.headers["X-CSRF-Protection"]).toBe("1");
    expect(restore.body).toEqual({
      items: [
        { type: "post", id: "p1" },
        { type: "thread", id: "t1" },
      ],
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps Restore disabled until something is ticked", async () => {
    mockFetch({
      [WEBSITES]: { body: { data: [WEBSITE] } },
      [DELETED]: list([deletedItem("post", "p1")]),
    });
    const user = userEvent.setup();
    renderPage();

    const restore = await screen.findByRole("button", { name: "Restore" });
    expect(restore).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: "Select post p1" }));

    expect(restore).toBeEnabled();
  });

  it("ticks every row with Select all, and shows it partly ticked when only some are", async () => {
    mockFetch({
      [WEBSITES]: { body: { data: [WEBSITE] } },
      [DELETED]: list([deletedItem("post", "p1"), deletedItem("update", "n1")]),
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole("checkbox", { name: "Select post p1" }),
    );
    const selectAll = screen.getByRole("checkbox", { name: "Select all" });
    expect(selectAll).toBePartiallyChecked();
    await user.click(selectAll);

    expect(selectAll).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Select update n1" }),
    ).toBeChecked();
  });

  it.each([
    ["update", "n1", 1],
    ["thread", "t1", 1],
    ["post", "p1", 2],
    ["gallery", "g1", 2],
  ])(
    "after restoring a %s, fetches the websites again only for a post or gallery",
    async (type, id, websiteFetchCount) => {
      const { calls } = mockFetch({
        [WEBSITES]: { body: { data: [WEBSITE] } },
        [DELETED]: list([deletedItem(type, id)]),
        [RESTORE]: {
          body: { data: { restored: [{ type, id }], failed: [] } },
        },
      });
      const user = userEvent.setup();
      renderPage();

      await user.click(
        await screen.findByRole("checkbox", { name: `Select ${type} ${id}` }),
      );
      await user.click(screen.getByRole("button", { name: "Restore" }));

      await waitFor(() =>
        expect(router.push).toHaveBeenCalledWith("/dashboard"),
      );
      expect(websiteFetches(calls)).toHaveLength(websiteFetchCount);
    },
  );

  it("names a gallery whose name was taken since while the rest are restored", async () => {
    mockFetch({
      [WEBSITES]: { body: { data: [WEBSITE] } },
      [DELETED]: [
        list([deletedItem("post", "p1"), deletedItem("gallery", "g1")]),
        list([deletedItem("gallery", "g1")]),
      ],
      [RESTORE]: {
        body: {
          data: {
            restored: [{ type: "post", id: "p1" }],
            failed: [
              {
                type: "gallery",
                id: "g1",
                message: "A gallery with this name already exists.",
              },
            ],
          },
        },
      },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole("checkbox", { name: "Select all" }),
    );
    await user.click(screen.getByRole("button", { name: "Restore" }));

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText(
        "Couldn't restore: gallery g1 (A gallery with this name already exists.)",
      ),
    ).toBeInTheDocument();
    await waitFor(() => expect(bodyRows()).toHaveLength(1));
    expect(
      screen.getByRole("checkbox", { name: "Select gallery g1" }),
    ).not.toBeChecked();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("says so when nothing has been deleted", async () => {
    mockFetch({
      [WEBSITES]: { body: { data: [WEBSITE] } },
      [DELETED]: list([]),
    });

    renderPage();

    expect(
      await screen.findByText("Nothing has been deleted in the last 30 days."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Deleted posts, galleries and messages can be restored for 30 days.",
      ),
    ).toBeInTheDocument();
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
      [DELETED]: list([deletedItem("post", "p2")], "p2"),
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
      [DELETED]: list([deletedItem("post", "p2")], "p2"),
      [`${DELETED}?cursor=p2`]: list([deletedItem("thread", "t1")]),
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Load more" }));

    await screen.findByText("thread t1");
    expect(bodyRows()).toHaveLength(2);
    expect(calls.map((call) => call.path)).toContain(
      "/api/siteOwner/deleted?cursor=p2",
    );
    expect(
      screen.queryByRole("button", { name: "Load more" }),
    ).not.toBeInTheDocument();
  });
});
