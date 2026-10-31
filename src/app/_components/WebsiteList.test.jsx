// Tests for WebsiteList and the PostTable and GalleryTable it renders (docs/flows.md → Get All
// Websites (site owner)): a heading per website with its post table and gallery table, each post
// row's created date, linked post name, indicator and actions menu, each gallery row's linked name
// and slug, and the empty states.

import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import WebsiteList from "./WebsiteList";

const WEBSITE = {
  id: "w1",
  websiteName: "Stevie The Dog",
  posts: [
    {
      id: "p2",
      postName: "Beach day",
      postDate: "2026-10-07",
      status: "published",
      createdAt: "2026-10-08T00:00:00.000Z",
    },
    {
      id: "p1",
      postName: "Walk day",
      postDate: null,
      status: "draft",
      createdAt: "2026-10-06T00:00:00.000Z",
    },
  ],
  galleries: [
    {
      id: "g1",
      galleryName: "Our Interior",
      slug: "our-interior",
      status: "draft",
      createdAt: "2026-10-31T00:00:00.000Z",
    },
  ],
};

describe("WebsiteList", () => {
  it("shows Loading… before the first response", () => {
    render(<WebsiteList websites={null} loading error={null} />);

    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows the API error message", () => {
    render(
      <WebsiteList
        websites={null}
        loading={false}
        error={{ message: "Request blocked." }}
      />,
    );

    expect(screen.getByText("Request blocked.")).toBeInTheDocument();
  });

  it("shows each website's posts in a table under its heading, in the order given", () => {
    render(<WebsiteList websites={[WEBSITE]} loading={false} error={null} />);

    expect(
      screen.getByRole("heading", { name: "Website: Stevie The Dog" }),
    ).toBeInTheDocument();
    const [table] = screen.getAllByRole("table");
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
    render(<WebsiteList websites={[WEBSITE]} loading={false} error={null} />);

    const [, beach, walk] = within(
      screen.getAllByRole("table")[0],
    ).getAllByRole("row");
    expect(beach).toHaveTextContent(
      new Date("2026-10-08T00:00:00.000Z").toLocaleDateString(),
    );
    expect(beach).not.toHaveTextContent("2026-10-07");
    expect(within(beach).getByText("published")).toBeInTheDocument();
    expect(within(walk).getByText("draft")).toBeInTheDocument();
    expect(
      within(walk).getByRole("button", { name: "Actions for Walk day" }),
    ).toBeInTheDocument();
  });

  it('shows "No posts yet." for a website without posts', () => {
    render(
      <WebsiteList
        websites={[{ ...WEBSITE, posts: [] }]}
        loading={false}
        error={null}
      />,
    );

    expect(screen.getByText("No posts yet.")).toBeInTheDocument();
  });

  it("shows each website's galleries in a table under its posts, with their slugs", () => {
    render(<WebsiteList websites={[WEBSITE]} loading={false} error={null} />);

    expect(
      screen.getByRole("heading", { name: "Galleries" }),
    ).toBeInTheDocument();
    const table = screen.getAllByRole("table")[1];
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual(["Gallery Name", "Gallery Code", "Status", "Actions"]);
    const [, row] = within(table).getAllByRole("row");
    expect(
      within(row).getByRole("link", { name: "Our Interior" }),
    ).toHaveAttribute("href", "/dashboard/gallery/g1");
    expect(row).toHaveTextContent("our-interior");
    expect(within(row).getByText("draft")).toBeInTheDocument();
    expect(
      within(row).getByRole("button", { name: "Actions for Our Interior" }),
    ).toBeInTheDocument();
  });

  it('shows "No galleries yet." for a website without galleries', () => {
    render(
      <WebsiteList
        websites={[{ ...WEBSITE, galleries: [] }]}
        loading={false}
        error={null}
      />,
    );

    expect(screen.getByText("No galleries yet.")).toBeInTheDocument();
  });
});
