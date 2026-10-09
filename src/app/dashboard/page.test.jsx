// Tests for the site owner dashboard's own wiring (docs/flows.md → Create a Post): the form
// opens from "Create a Post", and the list refetches only once the success dialog is closed.

import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
  active: true,
};

describe("Dashboard page", () => {
  it("creates a post, then refetches the list when the success dialog is closed", async () => {
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
    await user.type(screen.getByLabelText("Paragraph"), "We went for a walk.");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(
      await screen.findByText("Post Walk day has been created"),
    ).toBeInTheDocument();
    expect(websiteGets()).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Close" }));

    await waitFor(() => expect(websiteGets()).toHaveLength(2));
    expect(
      await screen.findByRole("link", { name: "Walk day" }),
    ).toBeInTheDocument();
  });

  it("disables Create a Post until the websites have loaded", () => {
    mockFetch({ "GET /api/siteOwner/websites": () => new Promise(() => {}) });

    render(<DashboardPage />);

    expect(
      screen.getByRole("button", { name: "Create a Post" }),
    ).toBeDisabled();
  });
});
