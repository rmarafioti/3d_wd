// Tests for the site owner dashboard's wiring: the ?create= forms, the post and gallery rows' ⋮
// menus, the Galleries table by ability, and the required request dialogs.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardPage from "./page";
import { SiteOwnerDataProvider } from "../_context/SiteOwnerDataContext";
import { mockFetch, pressEscape } from "../../test/helpers";

const router = { replace: vi.fn() };
// The page's address query, set per test (the Navbar's links add ?create=).
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(search),
  usePathname: () => "/dashboard",
}));

beforeEach(() => {
  search = "";
});

// The page reads the websites the dashboard layout fetches for it.
function renderPage() {
  return render(
    <SiteOwnerDataProvider>
      <DashboardPage />
    </SiteOwnerDataProvider>,
  );
}

// Both abilities live, as the backfill leaves Stevie's posts, so no request dialog opens.
const POSTS_ABILITY = {
  id: "ab1",
  kind: "posts",
  status: "live",
  turnedOn: true,
  placement: "live",
  requestNote: "The news page.",
  requestedAt: "2026-11-01T00:00:00.000Z",
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
};
const GALLERIES_ABILITY = {
  ...POSTS_ABILITY,
  id: "ab2",
  kind: "galleries",
  placement: null,
  requestNote: null,
};
const WEBSITE = {
  id: "w1",
  websiteName: "Stevie The Dog",
  url: "https://www.steviethedog.com",
  active: true,
  abilities: [POSTS_ABILITY, GALLERIES_ABILITY],
  posts: [],
  galleries: [],
};
const GALLERY = {
  id: "g1",
  galleryName: "Our Interior",
  slug: "our-interior",
  status: "published",
  createdAt: "2026-10-31T00:00:00.000Z",
};
const NEW_POST = {
  id: "p1",
  postName: "Walk day",
  postDate: null,
  status: "published",
  createdAt: "2026-10-07T00:00:00.000Z",
};

describe("Dashboard page", () => {
  it("creates a post, closes the form and refetches the list, with no success dialog", async () => {
    const { calls } = mockFetch({
      "GET /api/siteOwner/websites": [
        { body: { data: [{ ...WEBSITE, posts: [] }] } },
        { body: { data: [{ ...WEBSITE, posts: [NEW_POST] }] } },
      ],
      "POST /api/siteOwner/posts": {
        status: 201,
        body: { data: { ...NEW_POST, websiteId: "w1" } },
      },
    });
    search = "create=post";
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("dialog", { name: "Name your post" });
    const websiteGets = () =>
      calls.filter((call) => call.path === "/api/siteOwner/websites");

    await user.type(screen.getByLabelText("Post Name"), "Walk day");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.type(screen.getByLabelText("Paragraph"), "We went for a walk.");
    await user.click(screen.getByRole("button", { name: "Insert" }));
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(
      await screen.findByRole("link", { name: "Walk day" }),
    ).toBeInTheDocument();
    expect(websiteGets()).toHaveLength(2);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens Create a Post from ?create=post only once the websites have loaded, and drops the query", async () => {
    search = "create=post";
    mockFetch({
      "GET /api/siteOwner/websites": { body: { data: [WEBSITE] } },
    });

    renderPage();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      await screen.findByRole("dialog", { name: "Name your post" }),
    ).toBeInTheDocument();
    expect(router.replace).toHaveBeenCalledWith("/dashboard");
  });

  it("moves a post to draft from its ⋮ menu straight away, and the refetched row shows it", async () => {
    const { calls } = mockFetch({
      "GET /api/siteOwner/websites": [
        { body: { data: [{ ...WEBSITE, posts: [NEW_POST] }] } },
        {
          body: {
            data: [{ ...WEBSITE, posts: [{ ...NEW_POST, status: "draft" }] }],
          },
        },
      ],
      "PATCH /api/siteOwner/posts/p1/status": {
        body: { data: { ...NEW_POST, status: "draft" } },
      },
    });
    const user = userEvent.setup();
    renderPage();
    await user.click(
      await screen.findByRole("button", { name: "Actions for Walk day" }),
    );

    await user.click(screen.getByRole("button", { name: "Status to draft" }));

    expect(await screen.findByText("draft")).toBeInTheDocument();
    expect(calls.find((call) => call.method === "PATCH").body).toEqual({
      status: "draft",
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows a failed status change in a dialog and keeps the row as it was", async () => {
    mockFetch({
      "GET /api/siteOwner/websites": {
        body: { data: [{ ...WEBSITE, posts: [NEW_POST] }] },
      },
      "PATCH /api/siteOwner/posts/p1/status": {
        status: 404,
        body: { error: { message: "Post not found." } },
      },
    });
    const user = userEvent.setup();
    renderPage();
    await user.click(
      await screen.findByRole("button", { name: "Actions for Walk day" }),
    );

    await user.click(screen.getByRole("button", { name: "Status to draft" }));

    expect(await screen.findByRole("dialog")).toHaveTextContent(
      "Post not found.",
    );
    expect(screen.getByText("published")).toBeInTheDocument();
  });

  async function startDelete(deleteRoute) {
    const { calls } = mockFetch({
      "GET /api/siteOwner/websites": [
        { body: { data: [{ ...WEBSITE, posts: [NEW_POST] }] } },
        { body: { data: [{ ...WEBSITE, posts: [] }] } },
      ],
      "DELETE /api/siteOwner/posts/p1": deleteRoute,
    });
    const user = userEvent.setup();
    renderPage();
    await user.click(
      await screen.findByRole("button", { name: "Actions for Walk day" }),
    );
    await user.click(screen.getByRole("button", { name: "Delete" }));
    const deleteCalls = () => calls.filter((call) => call.method === "DELETE");
    return { user, deleteCalls };
  }

  it("deletes a post from its ⋮ menu once confirmed, and the list refetches without it", async () => {
    const { user, deleteCalls } = await startDelete({ status: 204 });
    const dialog = screen.getByRole("dialog");

    expect(dialog).toHaveTextContent(
      "Delete Walk day? It will be removed from your dashboard and your website. You can restore it from Recently Deleted for 30 days.",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Delete Post" }),
    );

    expect(await screen.findByText("No posts yet.")).toBeInTheDocument();
    expect(deleteCalls()).toHaveLength(1);
    expect(deleteCalls()[0].path).toBe("/api/siteOwner/posts/p1");
  });

  it("sends nothing when the delete is cancelled", async () => {
    const { user, deleteCalls } = await startDelete({ status: 204 });

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(deleteCalls()).toHaveLength(0);
    expect(screen.getByRole("link", { name: "Walk day" })).toBeInTheDocument();
  });

  it("shows a failed delete in a dialog and keeps the post listed", async () => {
    const { user } = await startDelete({
      status: 404,
      body: { error: { message: "Post not found." } },
    });

    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Delete Post",
      }),
    );

    expect(await screen.findByRole("dialog")).toHaveTextContent(
      "Post not found.",
    );
    expect(screen.getByRole("link", { name: "Walk day" })).toBeInTheDocument();
  });

  it("opens Create a Gallery's first step from ?create=gallery once the websites have loaded", async () => {
    search = "create=gallery";
    mockFetch({
      "GET /api/siteOwner/websites": { body: { data: [WEBSITE] } },
    });

    renderPage();

    expect(
      await screen.findByRole("dialog", { name: "Name your gallery" }),
    ).toBeInTheDocument();
  });

  it("moves a gallery to draft from its ⋮ menu through the gallery status route", async () => {
    const { calls } = mockFetch({
      "GET /api/siteOwner/websites": [
        { body: { data: [{ ...WEBSITE, galleries: [GALLERY] }] } },
        {
          body: {
            data: [
              { ...WEBSITE, galleries: [{ ...GALLERY, status: "draft" }] },
            ],
          },
        },
      ],
      "PATCH /api/siteOwner/galleries/g1/status": {
        body: { data: { ...GALLERY, status: "draft" } },
      },
    });
    const user = userEvent.setup();
    renderPage();
    await user.click(
      await screen.findByRole("button", { name: "Actions for Our Interior" }),
    );

    await user.click(screen.getByRole("button", { name: "Status to draft" }));

    expect(await screen.findByText("draft")).toBeInTheDocument();
    expect(calls.find((call) => call.method === "PATCH").body).toEqual({
      status: "draft",
    });
  });

  it("deletes a gallery from its ⋮ menu once confirmed, and the list refetches without it", async () => {
    const { calls } = mockFetch({
      "GET /api/siteOwner/websites": [
        { body: { data: [{ ...WEBSITE, galleries: [GALLERY] }] } },
        { body: { data: [WEBSITE] } },
      ],
      "DELETE /api/siteOwner/galleries/g1": { status: 204 },
    });
    const user = userEvent.setup();
    renderPage();
    await user.click(
      await screen.findByRole("button", { name: "Actions for Our Interior" }),
    );
    await user.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = screen.getByRole("dialog");

    expect(dialog).toHaveTextContent(
      "Delete Our Interior? It will be removed from your dashboard and your website. This can't be undone.",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Delete Gallery" }),
    );

    expect(await screen.findByText("No galleries yet.")).toBeInTheDocument();
    expect(
      calls.filter((call) => call.method === "DELETE").map((call) => call.path),
    ).toEqual(["/api/siteOwner/galleries/g1"]);
  });

  it("opens no gallery form and hides the Galleries table until the website has Photo Galleries", async () => {
    search = "create=gallery";
    mockFetch({
      "GET /api/siteOwner/websites": {
        body: { data: [{ ...WEBSITE, abilities: [POSTS_ABILITY] }] },
      },
    });

    renderPage();
    await screen.findByText("No posts yet.");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("Galleries")).not.toBeInTheDocument();
  });

  it("opens no request dialog while every ability with content is past added", async () => {
    mockFetch({
      "GET /api/siteOwner/websites": {
        body: { data: [{ ...WEBSITE, posts: [NEW_POST] }] },
      },
    });

    renderPage();
    await screen.findByRole("link", { name: "Walk day" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("requires the request form once posts with no placement have a post, and closes once it is requested", async () => {
    const added = {
      ...POSTS_ABILITY,
      status: "added",
      placement: null,
      requestNote: null,
      requestedAt: null,
    };
    const { calls } = mockFetch({
      "GET /api/siteOwner/websites": [
        {
          body: {
            data: [{ ...WEBSITE, abilities: [added], posts: [NEW_POST] }],
          },
        },
        {
          body: {
            data: [
              {
                ...WEBSITE,
                abilities: [
                  {
                    ...added,
                    placement: "requested",
                    requestedAt: "2026-11-03T00:00:00.000Z",
                  },
                ],
                posts: [NEW_POST],
              },
            ],
          },
        },
      ],
      "POST /api/siteOwner/abilities/ab1/request": {
        body: { data: { ...added, placement: "requested" } },
      },
    });
    const user = userEvent.setup();
    renderPage();
    const dialog = await screen.findByRole("dialog", {
      name: "Where should your posts go?",
    });
    const submit = within(dialog).getByRole("button", { name: "Submit" });

    pressEscape(dialog);
    expect(dialog).toHaveAttribute("open");
    expect(
      within(dialog).queryByRole("button", { name: "Close" }),
    ).not.toBeInTheDocument();
    expect(submit).toBeDisabled();

    await user.type(
      within(dialog).getByLabelText("Where on your website"),
      "  The news page.  ",
    );
    await user.click(submit);

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(calls.find((call) => call.method === "POST").body).toEqual({
      requestNote: "The news page.",
    });
  });

  it("keeps the request form open with the backend's message when it fails", async () => {
    const added = {
      ...POSTS_ABILITY,
      status: "added",
      placement: null,
      requestNote: null,
      requestedAt: null,
    };
    mockFetch({
      "GET /api/siteOwner/websites": {
        body: {
          data: [{ ...WEBSITE, abilities: [added], posts: [NEW_POST] }],
        },
      },
      "POST /api/siteOwner/abilities/ab1/request": {
        status: 409,
        body: {
          error: { message: "This ability has already been requested." },
        },
      },
    });
    const user = userEvent.setup();
    renderPage();
    const dialog = await screen.findByRole("dialog");

    await user.type(
      within(dialog).getByLabelText("Where on your website"),
      "The news page.",
    );
    await user.click(within(dialog).getByRole("button", { name: "Submit" }));

    expect(
      await within(dialog).findByText(
        "This ability has already been requested.",
      ),
    ).toBeInTheDocument();
    expect(dialog).toHaveAttribute("open");
  });

  it("asks for the posts' request again once a new first post follows every post being deleted", async () => {
    const posts = { ...POSTS_ABILITY, requestedAt: "2026-10-01T00:00:00.000Z" };
    const newerPost = { ...NEW_POST, createdAt: "2026-11-02T00:00:00.000Z" };
    mockFetch({
      "GET /api/siteOwner/websites": {
        body: {
          data: [
            {
              ...WEBSITE,
              abilities: [posts, GALLERIES_ABILITY],
              posts: [newerPost],
            },
          ],
        },
      },
    });

    renderPage();

    expect(
      await screen.findByRole("dialog", {
        name: "Where should your posts go?",
      }),
    ).toBeInTheDocument();
  });

  it("asks nothing for posts while a post from before the request is still there", async () => {
    const posts = { ...POSTS_ABILITY, requestedAt: "2026-11-01T00:00:00.000Z" };
    const olderPost = { ...NEW_POST, createdAt: "2026-10-31T00:00:00.000Z" };
    const newerPost = {
      ...NEW_POST,
      id: "p2",
      postName: "Beach day",
      createdAt: "2026-11-02T00:00:00.000Z",
    };
    mockFetch({
      "GET /api/siteOwner/websites": {
        body: {
          data: [
            {
              ...WEBSITE,
              abilities: [posts, GALLERIES_ABILITY],
              posts: [newerPost, olderPost],
            },
          ],
        },
      },
    });

    renderPage();
    await screen.findByRole("link", { name: "Beach day" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("asks where each new gallery goes, by name, and sends it to the gallery's request route", async () => {
    const pendingGallery = { ...GALLERY, requestedAt: null };
    const { calls } = mockFetch({
      "GET /api/siteOwner/websites": [
        { body: { data: [{ ...WEBSITE, galleries: [pendingGallery] }] } },
        {
          body: {
            data: [
              {
                ...WEBSITE,
                galleries: [
                  { ...GALLERY, requestedAt: "2026-11-02T00:00:00.000Z" },
                ],
              },
            ],
          },
        },
      ],
      "POST /api/siteOwner/galleries/g1/request": {
        body: { data: { ...GALLERY, requestNote: "The front page slider." } },
      },
    });
    const user = userEvent.setup();
    renderPage();
    const dialog = await screen.findByRole("dialog", {
      name: "Where should Our Interior go?",
    });

    await user.type(
      within(dialog).getByLabelText("Where on your website"),
      "The front page slider.",
    );
    await user.click(within(dialog).getByRole("button", { name: "Submit" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(calls.find((call) => call.method === "POST")).toMatchObject({
      path: "/api/siteOwner/galleries/g1/request",
      body: { requestNote: "The front page slider." },
    });
  });
});
