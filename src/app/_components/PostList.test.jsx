// Tests for PostList (docs/flows.md → Get All Websites (site owner)): a heading and a table per
// website, each row's created date, linked post name, indicator and actions menu, and the empty
// states.

import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import PostList from "./PostList";

const WEBSITE = {
  id: "w1",
  websiteName: "Stevie The Dog",
  posts: [
    {
      id: "p2",
      postName: "Beach day",
      postDate: "2026-10-07",
      active: true,
      createdAt: "2026-10-08T00:00:00.000Z",
    },
    {
      id: "p1",
      postName: "Walk day",
      postDate: null,
      active: false,
      createdAt: "2026-10-06T00:00:00.000Z",
    },
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

  it("shows each website's posts in a table under its heading, in the order given", () => {
    render(<PostList websites={[WEBSITE]} loading={false} error={null} />);

    expect(
      screen.getByRole("heading", { name: "Website: Stevie The Dog" }),
    ).toBeInTheDocument();
    const table = screen.getByRole("table");
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual(["Created", "Post Name", "Status", "Actions"]);
    const links = within(table).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "Beach day",
      "Walk day",
    ]);
    expect(links[0]).toHaveAttribute("href", "/dashboard/post/p2");
  });

  it("shows each row's created date (not its post date), indicator and actions menu", () => {
    render(<PostList websites={[WEBSITE]} loading={false} error={null} />);

    const [, beach, walk] = screen.getAllByRole("row");
    expect(beach).toHaveTextContent(
      new Date("2026-10-08T00:00:00.000Z").toLocaleDateString(),
    );
    expect(beach).not.toHaveTextContent("2026-10-07");
    expect(within(beach).getByText("active")).toBeInTheDocument();
    expect(within(walk).getByText("inactive")).toBeInTheDocument();
    expect(
      within(walk).getByRole("button", { name: "Actions for Walk day" }),
    ).toBeInTheDocument();
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
