// Tests for the site owner dashboard's own wiring (docs/flows.md → Create a Post, Post actions
// menu): the form opens from "Create a Post", and a create closes it and refetches the list with no
// success dialog; a row's ⋮ → Status to draft saves straight away and refetches, or shows a failure
// in a dialog; a row's ⋮ → Delete confirms, deletes and refetches, sends nothing when cancelled,
// and shows a failure in a dialog.

import { describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardPage from "./page";
import { mockFetch } from "../../test/helpers";

const WEBSITE = {
  id: "w1",
  websiteName: "Stevie The Dog",
  url: "https://www.steviethedog.com",
  active: true,
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
    const user = userEvent.setup();
    render(<DashboardPage />);
    await screen.findByText("No posts yet.");
    const websiteGets = () =>
      calls.filter((call) => call.path === "/api/siteOwner/websites");

    await user.click(screen.getByRole("button", { name: "Create a Post" }));
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

  it("disables Create a Post until the websites have loaded", () => {
    mockFetch({ "GET /api/siteOwner/websites": () => new Promise(() => {}) });

    render(<DashboardPage />);

    expect(
      screen.getByRole("button", { name: "Create a Post" }),
    ).toBeDisabled();
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
    render(<DashboardPage />);
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
    render(<DashboardPage />);
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
    render(<DashboardPage />);
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
      "Delete Walk day? It will be removed from your dashboard and your website. This can't be undone.",
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
});
