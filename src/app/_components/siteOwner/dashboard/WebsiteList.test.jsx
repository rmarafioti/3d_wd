// Tests for WebsiteList and the PostTable and GalleryTable it renders: each website's tables, their
// rows and the empty states.

import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import WebsiteList from "./WebsiteList";

const GALLERIES_ABILITY = {
  id: "ab2",
  kind: "galleries",
  status: "added",
  turnedOn: true,
  requestNote: null,
  requestedAt: null,
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
};
const WEBSITE = {
  id: "w1",
  websiteName: "Stevie The Dog",
  abilities: [
    { ...GALLERIES_ABILITY, id: "ab1", kind: "posts" },
    GALLERIES_ABILITY,
  ],
  posts: [
    {
      id: "p2",
      postName: "Beach day",
      postDate: "2026-10-07",
      status: "published",
      publishAt: null,
      publishedAt: "2026-10-08T00:00:00.000Z",
      createdAt: "2026-10-08T00:00:00.000Z",
    },
    {
      id: "p1",
      postName: "Walk day",
      postDate: null,
      status: "draft",
      publishAt: null,
      publishedAt: null,
      createdAt: "2026-10-06T00:00:00.000Z",
    },
  ],
  galleries: [
    {
      id: "g1",
      galleryName: "Our Interior",
      slug: "our-interior",
      status: "draft",
      placement: null,
      requestedAt: null,
      publishAt: null,
      publishedAt: null,
      createdAt: "2026-10-31T00:00:00.000Z",
    },
  ],
};
const SENT = "2026-11-01T00:00:00.000Z";

describe("WebsiteList", () => {
  it("shows the posts' live placement even when the website has no posts", () => {
    const website = {
      ...WEBSITE,
      abilities: [{ ...WEBSITE.abilities[0], placement: "live" }],
      posts: [],
    };

    render(<WebsiteList websites={[website]} loading={false} error={null} />);

    expect(screen.getByText("Placement:")).toBeInTheDocument();
    expect(screen.getByText("live")).toBeInTheDocument();
    expect(screen.getByText("No posts yet.")).toBeInTheDocument();
  });

  it("shows no placement before the posts' request form is sent", () => {
    const website = {
      ...WEBSITE,
      abilities: [{ ...WEBSITE.abilities[0], placement: null }],
    };

    render(<WebsiteList websites={[website]} loading={false} error={null} />);

    expect(screen.queryByText("Placement:")).not.toBeInTheDocument();
  });

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
    ).toEqual(["Created", "Post Name", "Status", "Live on", "Actions"]);
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
    ).toEqual([
      "Gallery Name",
      "Gallery Code",
      "Status",
      "Live on",
      "Placement",
      "Actions",
    ]);
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

  it("shows a gallery's placement in its own column once its request was sent", () => {
    const galleries = [
      { ...WEBSITE.galleries[0], id: "g1", galleryName: "Not Sent" },
      {
        ...WEBSITE.galleries[0],
        id: "g2",
        galleryName: "Asked",
        placement: "requested",
        requestedAt: SENT,
      },
      {
        ...WEBSITE.galleries[0],
        id: "g3",
        galleryName: "Placed",
        placement: "live",
        requestedAt: SENT,
      },
    ];

    render(
      <WebsiteList
        websites={[{ ...WEBSITE, galleries }]}
        loading={false}
        error={null}
      />,
    );

    const [, notSent, asked, placed] = within(
      screen.getAllByRole("table")[1],
    ).getAllByRole("row");
    expect(notSent.cells[4]).toBeEmptyDOMElement();
    expect(asked.cells[4]).toHaveTextContent(/^requested$/);
    expect(placed.cells[4]).toHaveTextContent(/^live$/);
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

  it("leaves out the Galleries table for a website without Photo Galleries", () => {
    render(
      <WebsiteList
        websites={[{ ...WEBSITE, abilities: [WEBSITE.abilities[0]] }]}
        loading={false}
        error={null}
      />,
    );

    expect(screen.getByText("Posts")).toBeInTheDocument();
    expect(screen.queryByText("Galleries")).not.toBeInTheDocument();
    expect(screen.queryByText("Our Interior")).not.toBeInTheDocument();
  });
});
