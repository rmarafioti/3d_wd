// Tests for the post page's own wiring: the body, the 404 view, the Published switch, closing Edit,
// Delete Post, and ?edit=1 opening the Edit form.

import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PostPage from "./page";
import { mockFetch } from "../../../../test/helpers";
import { toPublishAt } from "../../../_lib/publishAt";

const router = { push: vi.fn(), replace: vi.fn() };
// The page's query string; a test sets it before rendering.
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useParams: () => ({ id: "p1" }),
  useSearchParams: () => new URLSearchParams(search),
}));

const POST = {
  id: "p1",
  websiteId: "w1",
  websiteName: "Stevie The Dog",
  postName: "Walk day",
  header: null,
  subHeader: null,
  postDate: null,
  status: "published",
  publishAt: null,
  publishedAt: "2026-10-07T00:00:00.000Z",
  createdAt: "2026-10-07T00:00:00.000Z",
  updatedAt: "2026-10-07T00:00:00.000Z",
  body: [
    { type: "paragraph", text: "We went\nfor a walk." },
    {
      type: "image",
      image: {
        id: "i1",
        src: "https://res.cloudinary.com/demo/one.jpg",
        width: 800,
        height: 600,
        altText: "Stevie",
      },
    },
    { type: "paragraph", text: "The end." },
  ],
};

async function setup(routes, query = "") {
  search = query;
  const { calls } = mockFetch({
    "GET /api/siteOwner/posts/p1": { body: { data: POST } },
    ...routes,
  });
  const user = userEvent.setup();
  render(<PostPage />);
  await screen.findByRole("heading", { name: "Post Name: Walk day" });
  return { user, calls };
}

function button(name) {
  return screen.getByRole("button", { name });
}

function deleteCalls(calls) {
  return calls.filter(
    (call) =>
      call.method === "DELETE" && call.path === "/api/siteOwner/posts/p1",
  );
}

function statusCalls(calls) {
  return calls.filter((call) => call.path === "/api/siteOwner/posts/p1/status");
}

describe("Post page", () => {
  it('shows "None" for an empty post date, header and sub header', async () => {
    await setup();

    for (const key of ["Post Date:", "Header:", "Sub Header:"]) {
      expect(screen.getByText(key).nextElementSibling).toHaveTextContent(
        /^None$/,
      );
    }
  });

  it("renders the body in order, keeping a paragraph's line breaks and showing each image with its alt text beneath it", async () => {
    await setup();

    const paragraph = screen.getByText(/We went/);
    const image = screen.getByRole("img", { name: "Stevie" });
    expect(image).toHaveAttribute(
      "src",
      "https://res.cloudinary.com/demo/one.jpg",
    );
    expect(image.closest("figure")).toHaveTextContent(/^Alt Text: Stevie$/);
    const last = screen.getByText("The end.");
    expect(paragraph.textContent).toBe("We went\nfor a walk.");
    expect(paragraph.compareDocumentPosition(image)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(image.compareDocumentPosition(last)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("renders a paragraph's bold, italic and links", async () => {
    await setup({
      "GET /api/siteOwner/posts/p1": {
        body: {
          data: {
            ...POST,
            body: [
              {
                type: "paragraph",
                text: "A **good** *long* walk, see [the map](https://example.com/map).",
              },
            ],
          },
        },
      },
    });

    const link = screen.getByRole("link", { name: "the map" });

    expect(link).toHaveAttribute("href", "https://example.com/map");
    expect(link.parentElement).toContainHTML("A <b>good</b> <i>long</i> walk");
  });

  it('shows "Post not found." with a link back to /dashboard on a 404', async () => {
    mockFetch({
      "GET /api/siteOwner/posts/p1": {
        status: 404,
        body: { error: { message: "Post not found." } },
      },
    });

    render(<PostPage />);

    expect(await screen.findByText("Post not found.")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to dashboard" }),
    ).toHaveAttribute("href", "/dashboard");
  });

  it("moves the post to draft straight away when the Published switch is turned off: no confirmation, no dialog, and the pill follows", async () => {
    const { user, calls } = await setup({
      "PATCH /api/siteOwner/posts/p1/status": {
        body: { data: { ...POST, status: "draft" } },
      },
    });

    await user.click(screen.getByRole("switch", { name: "Published" }));

    await waitFor(() =>
      expect(screen.getByRole("switch", { name: "Published" })).toHaveAttribute(
        "aria-checked",
        "false",
      ),
    );
    expect(statusCalls(calls)[0].body).toEqual({ status: "draft" });
    // The switch's own words always show "draft" and "published", so the pill is the second
    // "draft" and there is no longer a "published" pill.
    expect(screen.getAllByText("draft")).toHaveLength(2);
    expect(screen.getAllByText("published")).toHaveLength(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("publishes a draft straight away when the switch is turned on", async () => {
    const { user, calls } = await setup({
      "GET /api/siteOwner/posts/p1": {
        body: { data: { ...POST, status: "draft" } },
      },
      "PATCH /api/siteOwner/posts/p1/status": { body: { data: POST } },
    });

    await user.click(screen.getByRole("switch", { name: "Published" }));

    await waitFor(() =>
      expect(screen.getByRole("switch", { name: "Published" })).toHaveAttribute(
        "aria-checked",
        "true",
      ),
    );
    expect(statusCalls(calls)[0].body).toEqual({ status: "published" });
    expect(screen.getAllByText("published")).toHaveLength(2);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("sets a draft's publish date from the page with Set publish date, sending only the date and going back to /dashboard, both buttons disabled until there is something to do", async () => {
    const draft = { ...POST, status: "draft", publishedAt: null };
    const later = toPublishAt("2030-12-01");
    const { user, calls } = await setup({
      "GET /api/siteOwner/posts/p1": { body: { data: draft } },
      "PATCH /api/siteOwner/posts/p1/publishAt": {
        body: { data: { ...draft, publishAt: later } },
      },
    });
    const date = screen.getByLabelText("Date");
    expect(date).toHaveValue("");
    expect(button("Clear")).toBeDisabled();
    expect(button("Set publish date")).toBeDisabled();

    await user.type(date, "2030-12-01");
    await user.click(button("Set publish date"));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/dashboard"));
    const set = calls.find((call) => call.path.endsWith("/publishAt"));
    expect(set.method).toBe("PATCH");
    expect(set.body).toEqual({ publishAt: later });
    expect(set.headers["X-CSRF-Protection"]).toBe("1");
  });

  it("clears a saved publish date with Clear, staying on the page", async () => {
    const scheduled = {
      ...POST,
      status: "draft",
      publishedAt: null,
      publishAt: toPublishAt("2030-11-20"),
    };
    const { user, calls } = await setup({
      "GET /api/siteOwner/posts/p1": { body: { data: scheduled } },
      "PATCH /api/siteOwner/posts/p1/publishAt": {
        body: { data: { ...scheduled, publishAt: null } },
      },
    });
    expect(screen.getByLabelText("Date")).toHaveValue("2030-11-20");

    await user.click(button("Clear"));

    await waitFor(() => expect(screen.getByLabelText("Date")).toHaveValue(""));
    const clear = calls.find((call) => call.path.endsWith("/publishAt"));
    expect(clear.body).toEqual({ publishAt: null });
    expect(router.push).not.toHaveBeenCalled();
  });

  it("shows the backend's publish date message under the field and keeps the date picked", async () => {
    const draft = { ...POST, status: "draft", publishedAt: null };
    const { user } = await setup({
      "GET /api/siteOwner/posts/p1": { body: { data: draft } },
      "PATCH /api/siteOwner/posts/p1/publishAt": {
        status: 400,
        body: {
          error: {
            message: "Please fix the highlighted fields.",
            fields: { publishAt: "Only a draft can have a go-live date." },
          },
        },
      },
    });

    await user.type(screen.getByLabelText("Date"), "2030-12-01");
    await user.click(button("Set publish date"));

    expect(
      await screen.findByText("Only a draft can have a go-live date."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Date")).toHaveValue("2030-12-01");
  });

  it("shows no publish date on a published post, and drops it once a draft is published by hand", async () => {
    const scheduled = {
      ...POST,
      status: "draft",
      publishedAt: null,
      publishAt: toPublishAt("2030-11-20"),
    };
    const { user } = await setup({
      "GET /api/siteOwner/posts/p1": { body: { data: scheduled } },
      "PATCH /api/siteOwner/posts/p1/status": { body: { data: POST } },
    });
    expect(screen.getByLabelText("Date")).toBeInTheDocument();

    await user.click(screen.getByRole("switch", { name: "Published" }));

    await waitFor(() =>
      expect(screen.queryByLabelText("Date")).not.toBeInTheDocument(),
    );
  });

  it("shows a failed status change in a dialog and leaves the switch as it was", async () => {
    const { user } = await setup({
      "PATCH /api/siteOwner/posts/p1/status": {
        status: 500,
        body: { error: { message: "Something went wrong, please try again." } },
      },
    });
    await user.click(screen.getByRole("switch", { name: "Published" }));

    await screen.findByText("Something went wrong, please try again.");
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.getByRole("switch", { name: "Published" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(router.push).not.toHaveBeenCalled();
  });

  it("closes the form and shows the edit after Edit Post succeeds, with no success dialog", async () => {
    const { user } = await setup({
      "PATCH /api/siteOwner/posts/p1": {
        body: { data: { ...POST, postName: "Beach day" } },
      },
    });
    await user.click(screen.getByRole("button", { name: "Edit Post" }));
    await user.click(
      screen.getByRole("button", { name: "Actions for post name" }),
    );
    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.clear(screen.getByLabelText("Post Name"));
    await user.type(screen.getByLabelText("Post Name"), "Beach day");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(
      await screen.findByRole("heading", { name: "Post Name: Beach day" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("deletes the post once it is confirmed and goes back to /dashboard", async () => {
    const { user, calls } = await setup({
      "DELETE /api/siteOwner/posts/p1": { status: 204 },
    });
    await user.click(screen.getByRole("button", { name: "Delete Post" }));
    const dialog = screen.getByRole("dialog");

    expect(dialog).toHaveTextContent(
      "Delete Walk day? It will be removed from your dashboard and your website. You can restore it from Recently Deleted for 30 days.",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Delete Post" }),
    );

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/dashboard"));
    expect(deleteCalls(calls)).toHaveLength(1);
    expect(deleteCalls(calls)[0].headers["X-CSRF-Protection"]).toBe("1");
  });

  it("sends nothing when the delete is cancelled", async () => {
    const { user, calls } = await setup();
    await user.click(screen.getByRole("button", { name: "Delete Post" }));

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(deleteCalls(calls)).toHaveLength(0);
    expect(
      screen.getByRole("heading", { name: "Post Name: Walk day" }),
    ).toBeInTheDocument();
  });

  it("shows a failed delete in a dialog and stays on the post", async () => {
    const { user } = await setup({
      "DELETE /api/siteOwner/posts/p1": {
        status: 404,
        body: { error: { message: "Post not found." } },
      },
    });
    await user.click(screen.getByRole("button", { name: "Delete Post" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Delete Post",
      }),
    );

    expect(await screen.findByRole("dialog")).toHaveTextContent(
      "Post not found.",
    );
    expect(
      screen.getByRole("heading", { name: "Post Name: Walk day" }),
    ).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("opens the Edit form on load from ?edit=1, then drops it from the address", async () => {
    await setup({}, "edit=1");

    expect(
      await screen.findByRole("dialog", { name: "Edit Post" }),
    ).toBeInTheDocument();
    expect(router.replace).toHaveBeenCalledWith("/dashboard/post/p1");
  });

  it("opens no form without ?edit=1", async () => {
    await setup();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
