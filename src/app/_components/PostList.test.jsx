// Tests for PostList (docs/flows.md → Get All Websites (site owner)): a heading per website,
// each post linking to its page with its date and indicator, and the empty states.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import PostList from "./PostList";

const WEBSITE = {
  id: "w1",
  websiteName: "Stevie The Dog",
  posts: [
    { id: "p2", postName: "Beach day", postDate: "2026-10-07", active: true },
    { id: "p1", postName: "Walk day", postDate: null, active: false },
  ],
};

describe("PostList", () => {
  it("shows Loading… before the first response", () => {
    render(<PostList websites={null} loading error={null} />);

    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows the API error message", () => {
    render(
      <PostList
        websites={null}
        loading={false}
        error={{ message: "Request blocked." }}
      />,
    );

    expect(screen.getByText("Request blocked.")).toBeInTheDocument();
  });

  it("links each post to /dashboard/post/{id} under its website's heading, in the order given", () => {
    render(<PostList websites={[WEBSITE]} loading={false} error={null} />);

    expect(
      screen.getByRole("heading", { name: "Stevie The Dog" }),
    ).toBeInTheDocument();
    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "Beach day",
      "Walk day",
    ]);
    expect(links[0]).toHaveAttribute("href", "/dashboard/post/p2");
  });

  it("shows the post date only when set, and the active / inactive indicator", () => {
    render(<PostList websites={[WEBSITE]} loading={false} error={null} />);

    const [beach, walk] = screen.getAllByRole("listitem");
    expect(beach).toHaveTextContent("Beach day — 2026-10-07 — active");
    expect(walk).toHaveTextContent("Walk day — inactive");
  });

  it('shows "No posts yet." for a website without posts', () => {
    render(
      <PostList
        websites={[{ ...WEBSITE, posts: [] }]}
        loading={false}
        error={null}
      />,
    );

    expect(screen.getByText("No posts yet.")).toBeInTheDocument();
  });
});
