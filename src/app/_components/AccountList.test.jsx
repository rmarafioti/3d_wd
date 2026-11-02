// Tests for AccountList (docs/flows.md → Get All Accounts): loading, error and empty states; each
// account a disclosure named by the site owner, holding its email, status and Websites disclosure
// (websites, indicators and "Link a Website", which passes the account up); under each website its
// Abilities: each a disclosure, closed by default, named by its name, pill and Live switch (only
// while requested), holding its items and request note: posts by name and status, galleries by name and
// status, each opening to its photo count and crop flags.

import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AccountList from "./AccountList";

const POSTS_ABILITY = {
  id: "ab1",
  kind: "posts",
  status: "live",
  turnedOn: false,
  requestNote: "The news page.",
  requestedAt: "2026-11-01T00:00:00.000Z",
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
};
const GALLERIES_ABILITY = {
  id: "ab2",
  kind: "galleries",
  status: "requested",
  turnedOn: true,
  requestNote: "A Gallery page,\nlinked from the menu.",
  requestedAt: "2026-11-02T00:00:00.000Z",
  createdAt: "2026-11-02T00:00:00.000Z",
  updatedAt: "2026-11-02T00:00:00.000Z",
};
const WEBSITE = {
  id: "w1",
  websiteName: "Stevie The Dog",
  url: "https://www.steviethedog.com",
  active: false,
  abilities: [POSTS_ABILITY, GALLERIES_ABILITY],
  posts: [{ id: "p1", postName: "Walk day", status: "draft" }],
  galleries: [
    {
      id: "g1",
      galleryName: "Our Interior",
      status: "published",
      imageCount: 12,
      hasThumbnails: true,
      hasMobileCrops: false,
      requestNote: "The front page slider.",
    },
  ],
};
const ACCOUNT = {
  id: "a1",
  name: "Richard Marafioti",
  email: "steviethedogchi@gmail.com",
  active: true,
  websites: [WEBSITE],
};

function renderList(accounts, props = {}) {
  render(
    <AccountList
      accounts={accounts}
      loading={false}
      error={null}
      onLink={() => {}}
      onSetLive={() => {}}
      {...props}
    />,
  );
}

// Opens the account's disclosure (its summary is the first "Richard Marafioti"), then Websites.
async function openWebsites(user) {
  await user.click(screen.getAllByText("Richard Marafioti")[0]);
  await user.click(screen.getByText("Websites"));
}

describe("AccountList", () => {
  it("shows Loading… before the first response", () => {
    render(
      <AccountList accounts={null} loading error={null} onLink={() => {}} />,
    );

    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows the API error message", () => {
    render(
      <AccountList
        accounts={null}
        loading={false}
        error={{ message: "Something went wrong, please try again." }}
        onLink={() => {}}
      />,
    );

    expect(
      screen.getByText("Something went wrong, please try again."),
    ).toBeInTheDocument();
  });

  it('shows "No site owner accounts yet." with no accounts', () => {
    renderList([]);

    expect(screen.getByText("No site owner accounts yet.")).toBeInTheDocument();
  });

  it("lists each account by its site owner's name, closed by default", () => {
    renderList([ACCOUNT]);

    const account = screen.getAllByText("Richard Marafioti")[0];
    expect(account.closest("details")).not.toHaveAttribute("open");
  });

  it("opens an account to its site owner, email, status and websites with indicators", async () => {
    const user = userEvent.setup();
    renderList([ACCOUNT]);

    await openWebsites(user);

    expect(screen.getByText("Site Owner:").nextSibling).toHaveTextContent(
      "Richard Marafioti",
    );
    expect(screen.getByText("Email:").nextSibling).toHaveTextContent(
      "steviethedogchi@gmail.com",
    );
    expect(screen.getByText("active")).toBeInTheDocument();
    expect(screen.getByText("inactive")).toBeInTheDocument();
  });

  it("links each website name to its URL in a new tab", async () => {
    const user = userEvent.setup();
    renderList([ACCOUNT]);

    await openWebsites(user);
    const link = screen.getByRole("link", { name: "Stevie The Dog" });

    expect(link).toHaveAttribute("href", "https://www.steviethedog.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it('shows "No websites linked." for an account without websites', () => {
    renderList([{ ...ACCOUNT, websites: [] }]);

    expect(screen.getByText("No websites linked.")).toBeInTheDocument();
  });

  it('passes the account to onLink from its "Link a Website" button', async () => {
    const onLink = vi.fn();
    const user = userEvent.setup();
    renderList([ACCOUNT], { onLink });
    await openWebsites(user);

    await user.click(screen.getByRole("button", { name: "Link a Website" }));

    expect(onLink).toHaveBeenCalledWith(ACCOUNT);
  });

  it("keeps showing the list during a refetch", () => {
    renderList([ACCOUNT], { loading: true });

    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
    expect(screen.getAllByText("Richard Marafioti")).not.toHaveLength(0);
  });

  it("shows each ability under one Abilities heading, with its pill, and the posts' request note", () => {
    renderList([ACCOUNT]);

    expect(screen.getAllByText("Abilities")).toHaveLength(1);
    const posts = within(screen.getByText("Posts").parentElement);
    expect(posts.getByText("off")).toBeInTheDocument();
    const galleries = within(screen.getByText("Photo Galleries").parentElement);
    expect(galleries.getByText("requested")).toBeInTheDocument();
    expect(screen.getByText("The news page.")).toBeInTheDocument();
  });

  it("shows each gallery's own request note inside its dropdown, and not the galleries ability's", () => {
    renderList([ACCOUNT]);
    const gallery = within(screen.getByText("Our Interior").closest("details"));

    expect(gallery.getByText("The front page slider.")).toBeInTheDocument();
    expect(
      screen.queryByText(/A Gallery page,\s+linked from the menu\./),
    ).not.toBeInTheDocument();
  });

  it("lists each post by name with its status", () => {
    renderList([ACCOUNT]);

    const post = screen.getByText("Walk day").parentElement;
    expect(within(post).getByText("draft")).toBeInTheDocument();
  });

  it("lists each gallery by name and status, opening to its photo count and crop flags", async () => {
    const user = userEvent.setup();
    renderList([ACCOUNT]);
    const name = screen.getByText("Our Interior");
    const gallery = name.closest("details");

    expect(
      within(name.parentElement).getByText("published"),
    ).toBeInTheDocument();
    expect(gallery).not.toHaveAttribute("open");

    await user.click(name);

    expect(gallery).toHaveAttribute("open");
    const summary = within(gallery);
    expect(summary.getByText("Photos:").nextSibling).toHaveTextContent("12");
    expect(summary.getByText("Thumbnails:").nextSibling).toHaveTextContent(
      "Yes",
    );
    expect(summary.getByText("Mobile crop:").nextSibling).toHaveTextContent(
      "No",
    );
  });

  it('shows "No posts yet." and "No galleries yet." for an ability without items', () => {
    renderList([
      { ...ACCOUNT, websites: [{ ...WEBSITE, posts: [], galleries: [] }] },
    ]);

    expect(screen.getByText("No posts yet.")).toBeInTheDocument();
    expect(screen.getByText("No galleries yet.")).toBeInTheDocument();
  });

  it("leaves out an ability the website hasn't added", () => {
    renderList([
      { ...ACCOUNT, websites: [{ ...WEBSITE, abilities: [POSTS_ABILITY] }] },
    ]);

    expect(screen.queryByText("Photo Galleries")).not.toBeInTheDocument();
    expect(screen.queryByText("Our Interior")).not.toBeInTheDocument();
  });

  it("offers the Live switch, off, only on a requested ability, and none once live", async () => {
    const onSetLive = vi.fn();
    const user = userEvent.setup();
    renderList([ACCOUNT], { onSetLive });
    await openWebsites(user);
    const requested = screen.getByRole("switch", {
      name: "Photo Galleries live for Stevie The Dog",
    });

    expect(requested).not.toBeChecked();
    expect(
      screen.queryByRole("switch", { name: "Posts live for Stevie The Dog" }),
    ).not.toBeInTheDocument();

    await user.click(requested);

    expect(onSetLive).toHaveBeenCalledWith(GALLERIES_ABILITY, WEBSITE);
  });

  it("shows no Live switch on an ability not yet requested", () => {
    renderList([
      {
        ...ACCOUNT,
        websites: [
          {
            ...WEBSITE,
            abilities: [{ ...POSTS_ABILITY, status: "added" }],
          },
        ],
      },
    ]);

    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("closes each ability by default, opening to its items, and its Live switch never opens or closes it", async () => {
    const onSetLive = vi.fn();
    const user = userEvent.setup();
    renderList([ACCOUNT], { onSetLive });
    await openWebsites(user);
    const ability = screen.getByText("Photo Galleries").closest("details");

    expect(ability).not.toHaveAttribute("open");

    await user.click(
      screen.getByRole("switch", {
        name: "Photo Galleries live for Stevie The Dog",
      }),
    );

    expect(onSetLive).toHaveBeenCalled();
    expect(ability).not.toHaveAttribute("open");

    await user.click(screen.getByText("Photo Galleries"));

    expect(ability).toHaveAttribute("open");
    expect(within(ability).getByText("Our Interior")).toBeInTheDocument();
  });
});
