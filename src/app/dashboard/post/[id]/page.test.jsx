// Tests for the single post page's own wiring (docs/flows.md → Get a Post by ID, Archive / Make
// Active, Edit a Post): the body in order with line breaks kept, the 404 view, the Active switch
// (off archives and on activates straight away, with no dialogs, the pill following and the page
// staying put), a failed status change leaving the switch as it was, and staying put after an edit.

import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PostPage from "./page";
import { mockFetch } from "../../../../test/helpers";

const router = { push: vi.fn(), replace: vi.fn() };
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useParams: () => ({ id: "p1" }),
}));

const POST = {
  id: "p1",
  websiteId: "w1",
  websiteName: "Stevie The Dog",
  postName: "Walk day",
  header: null,
  subHeader: null,
  postDate: null,
  active: true,
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

async function setup(routes) {
  const { calls } = mockFetch({
    "GET /api/siteOwner/posts/p1": { body: { data: POST } },
    ...routes,
  });
  const user = userEvent.setup();
  render(<PostPage />);
  await screen.findByRole("heading", { name: "Post Name: Walk day" });
  return { user, calls };
}

function statusCalls(calls) {
  return calls.filter((call) => call.path === "/api/siteOwner/posts/p1/status");
}

describe("Post page", () => {
  it("renders the body in order, keeping a paragraph's line breaks and showing each image with its alt text and size", async () => {
    await setup();

    const paragraph = screen.getByText(/We went/);
    const image = screen.getByRole("img", { name: "Stevie" });
    expect(image).toHaveAttribute(
      "src",
      "https://res.cloudinary.com/demo/one.jpg",
    );
    expect(screen.getByText("Stevie, 800 × 600")).toBeInTheDocument();
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

  it("archives straight away when the Active switch is turned off: no confirmation, no dialog, and the pill follows", async () => {
    const { user, calls } = await setup({
      "PATCH /api/siteOwner/posts/p1/status": {
        body: { data: { ...POST, active: false } },
      },
    });

    await user.click(screen.getByRole("switch", { name: "Active" }));

    await waitFor(() =>
      expect(screen.getByRole("switch", { name: "Active" })).toHaveAttribute(
        "aria-checked",
        "false",
      ),
    );
    expect(statusCalls(calls)[0].body).toEqual({ active: false });
    // The switch's own words always show "inactive" and "active", so the pill is the second
    // "inactive" and there is no longer an "active" pill.
    expect(screen.getAllByText("inactive")).toHaveLength(2);
    expect(screen.getAllByText("active")).toHaveLength(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("makes an inactive post active straight away when the switch is turned on", async () => {
    const { user, calls } = await setup({
      "GET /api/siteOwner/posts/p1": {
        body: { data: { ...POST, active: false } },
      },
      "PATCH /api/siteOwner/posts/p1/status": { body: { data: POST } },
    });

    await user.click(screen.getByRole("switch", { name: "Active" }));

    await waitFor(() =>
      expect(screen.getByRole("switch", { name: "Active" })).toHaveAttribute(
        "aria-checked",
        "true",
      ),
    );
    expect(statusCalls(calls)[0].body).toEqual({ active: true });
    expect(screen.getAllByText("active")).toHaveLength(2);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows a failed status change in a dialog and leaves the switch as it was", async () => {
    const { user } = await setup({
      "PATCH /api/siteOwner/posts/p1/status": {
        status: 500,
        body: { error: { message: "Something went wrong, please try again." } },
      },
    });
    await user.click(screen.getByRole("switch", { name: "Active" }));

    await screen.findByText("Something went wrong, please try again.");
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.getByRole("switch", { name: "Active" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(router.push).not.toHaveBeenCalled();
  });

  it("stays on the page showing the edit after Edit Post succeeds", async () => {
    const { user } = await setup({
      "PATCH /api/siteOwner/posts/p1": {
        body: { data: { ...POST, postName: "Beach day" } },
      },
    });
    await user.click(screen.getByRole("button", { name: "Edit Post" }));
    await user.clear(screen.getByLabelText("Post Name"));
    await user.type(screen.getByLabelText("Post Name"), "Beach day");

    await user.click(screen.getByRole("button", { name: "Publish" }));
    await screen.findByText("Post Beach day has been updated");
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(
      screen.getByRole("heading", { name: "Post Name: Beach day" }),
    ).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });
});
