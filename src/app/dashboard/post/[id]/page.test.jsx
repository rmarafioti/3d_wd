// Tests for the single post page's own wiring (docs/flows.md → Get a Post by ID, Archive / Make
// Active, Edit a Post): the 404 view, archive behind ConfirmDialog then back to /dashboard, Make
// Post Active with no confirmation, a failed status change, and staying put after an edit.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
  body: "We went for a walk.",
  postDate: null,
  active: true,
  createdAt: "2026-10-07T00:00:00.000Z",
  updatedAt: "2026-10-07T00:00:00.000Z",
  images: [],
  links: [],
};

async function setup(routes) {
  const { calls } = mockFetch({
    "GET /api/siteOwner/posts/p1": { body: { data: POST } },
    ...routes,
  });
  const user = userEvent.setup();
  render(<PostPage />);
  await screen.findByRole("heading", { name: "Walk day" });
  return { user, calls };
}

function statusCalls(calls) {
  return calls.filter((call) => call.path === "/api/siteOwner/posts/p1/status");
}

describe("Post page", () => {
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

  it("asks before archiving, then archives and routes to /dashboard when the result is closed", async () => {
    const { user, calls } = await setup({
      "PATCH /api/siteOwner/posts/p1/status": {
        body: { data: { ...POST, active: false } },
      },
    });

    await user.click(screen.getByRole("button", { name: "Archive Post" }));

    expect(
      screen.getByText(
        "Are you sure you want to archive Walk day? It will be removed from your website.",
      ),
    ).toBeInTheDocument();
    expect(statusCalls(calls)).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "Archive" }));

    expect(
      await screen.findByText("Post Walk day has been updated to Archived"),
    ).toBeInTheDocument();
    expect(statusCalls(calls)[0].body).toEqual({ active: false });

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(router.push).toHaveBeenCalledWith("/dashboard");
  });

  it("sends nothing when the archive confirmation is cancelled", async () => {
    const { user, calls } = await setup();

    await user.click(screen.getByRole("button", { name: "Archive Post" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(statusCalls(calls)).toHaveLength(0);
    expect(
      screen.getByRole("button", { name: "Archive Post" }),
    ).toBeInTheDocument();
  });

  it("makes an inactive post active straight away, with no confirmation", async () => {
    const { user, calls } = await setup({
      "GET /api/siteOwner/posts/p1": {
        body: { data: { ...POST, active: false } },
      },
      "PATCH /api/siteOwner/posts/p1/status": { body: { data: POST } },
    });

    await user.click(screen.getByRole("button", { name: "Make Post Active" }));

    expect(
      await screen.findByText("Post Walk day has been updated to Active"),
    ).toBeInTheDocument();
    expect(statusCalls(calls)[0].body).toEqual({ active: true });
  });

  it("shows a failed status change in a dialog and stays on the page", async () => {
    const { user } = await setup({
      "PATCH /api/siteOwner/posts/p1/status": {
        status: 500,
        body: { error: { message: "Something went wrong, please try again." } },
      },
    });
    await user.click(screen.getByRole("button", { name: "Archive Post" }));
    await user.click(screen.getByRole("button", { name: "Archive" }));

    await screen.findByText("Something went wrong, please try again.");
    await user.click(screen.getByRole("button", { name: "Close" }));

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

    await user.click(screen.getByRole("button", { name: "Submit" }));
    await screen.findByText("Post Beach day has been updated");
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(
      screen.getByRole("heading", { name: "Beach day" }),
    ).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });
});
