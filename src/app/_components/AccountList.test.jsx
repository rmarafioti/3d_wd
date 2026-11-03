// Tests for AccountList (docs/flows.md → Get All Accounts): loading, error and empty states; each
// website a disclosure named by the website, holding its URL and its site owners (name, email,
// status and a ⋮ offering "Link a Website", which passes the account up), two owners of one website under it
// once, an account with no website left out; then the website's Abilities: each a disclosure,
// closed by default, named by its name, status pill, posts' placement pill and Live switch (Photo
// Galleries while added, posts while their placement is requested), holding its items and request
// note: posts by name and status, galleries by name and status, each opening to its placement
// (with its own Live switch while requested once Photo Galleries is live), photo count and crop
// flags.

import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AccountList from "./AccountList";

const POSTS_ABILITY = {
  id: "ab1",
  kind: "posts",
  status: "live",
  turnedOn: false,
  placement: "live",
  requestNote: "The news page.",
  requestedAt: "2026-11-01T00:00:00.000Z",
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
};
const GALLERIES_ABILITY = {
  id: "ab2",
  kind: "galleries",
  status: "added",
  turnedOn: true,
  placement: null,
  requestNote: null,
  requestedAt: null,
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
      placement: "requested",
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

// Opens the website's disclosure.
async function openWebsite(user) {
  await user.click(screen.getByText("Stevie The Dog"));
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

  it("lists each website by its name, closed by default", () => {
    renderList([ACCOUNT]);

    const website = screen.getByText("Stevie The Dog");
    expect(website.closest("details")).not.toHaveAttribute("open");
  });

  it("opens a website to its URL and its site owner's name, email and status", async () => {
    const user = userEvent.setup();
    renderList([ACCOUNT]);

    await openWebsite(user);

    expect(screen.getByText("Site Owner:").parentElement).toHaveTextContent(
      "active",
    );
    expect(
      screen.getByText("Site Owner:").parentElement.nextSibling,
    ).toHaveTextContent("Richard Marafioti");
    expect(screen.getByText("Email:").nextSibling).toHaveTextContent(
      "steviethedogchi@gmail.com",
    );
    expect(
      within(screen.getByText("Stevie The Dog").parentElement).getByText(
        "inactive",
      ),
    ).toBeInTheDocument();
  });

  it("links the website's URL in a new tab", async () => {
    const user = userEvent.setup();
    renderList([ACCOUNT]);

    await openWebsite(user);
    const link = screen.getByRole("link", {
      name: "https://www.steviethedog.com",
    });

    expect(link).toHaveAttribute("href", "https://www.steviethedog.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("lists a website shared by two site owners once, with both owners under it", () => {
    const second = {
      ...ACCOUNT,
      id: "a2",
      name: "Sam Owner",
      email: "sam@example.com",
    };
    renderList([ACCOUNT, second]);

    expect(screen.getAllByText("Stevie The Dog")).toHaveLength(1);
    expect(screen.getByText("Richard Marafioti")).toBeInTheDocument();
    expect(screen.getByText("Sam Owner")).toBeInTheDocument();
  });

  it("sorts the websites by name", () => {
    const other = {
      ...ACCOUNT,
      id: "a2",
      websites: [{ ...WEBSITE, id: "w2", websiteName: "Acme Bakery" }],
    };
    renderList([ACCOUNT, other]);

    const names = screen
      .getAllByRole("group")
      .map((details) => details.querySelector("summary").textContent);
    expect(names[0]).toMatch(/^Acme Bakery/);
  });

  it('leaves out an account without websites, showing "No site owner accounts yet." when none has one', () => {
    renderList([{ ...ACCOUNT, websites: [] }]);

    expect(screen.queryByText("Richard Marafioti")).not.toBeInTheDocument();
    expect(screen.getByText("No site owner accounts yet.")).toBeInTheDocument();
  });

  it('passes the site owner\'s account to onLink from its ⋮ "Link a Website"', async () => {
    const second = { ...ACCOUNT, id: "a2", name: "Sam Owner" };
    const onLink = vi.fn();
    const user = userEvent.setup();
    renderList([ACCOUNT, second], { onLink });
    await openWebsite(user);

    await user.click(
      screen.getByRole("button", { name: "Actions for Sam Owner" }),
    );
    await user.click(screen.getByRole("button", { name: "Link a Website" }));

    expect(onLink).toHaveBeenCalledWith(second);
  });

  it("keeps showing the list during a refetch", () => {
    renderList([ACCOUNT], { loading: true });

    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
    expect(screen.getByText("Stevie The Dog")).toBeInTheDocument();
  });

  it("shows each ability under one Abilities heading, with its pill, and the posts' request note", () => {
    renderList([ACCOUNT]);

    expect(screen.getAllByText("Abilities")).toHaveLength(1);
    const posts = within(screen.getByText("Posts").parentElement);
    expect(posts.getByText("off")).toBeInTheDocument();
    expect(posts.queryByText("live")).not.toBeInTheDocument();
    const galleries = within(screen.getByText("Photo Galleries").parentElement);
    expect(galleries.getByText("added")).toBeInTheDocument();
    expect(screen.getByText("The news page.")).toBeInTheDocument();
  });

  it("shows each gallery's own placement and request note inside its dropdown", () => {
    renderList([ACCOUNT]);
    const gallery = within(screen.getByText("Our Interior").closest("details"));

    expect(gallery.getByText("Placement:").nextSibling).toHaveTextContent(
      "requested",
    );
    expect(gallery.getByText("The front page slider.")).toBeInTheDocument();
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

  it("offers the Live switch, off, on Photo Galleries while added, and none on posts already placed live", async () => {
    const onSetLive = vi.fn();
    const user = userEvent.setup();
    renderList([ACCOUNT], { onSetLive });
    await openWebsite(user);
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

  it("shows no Live switch on posts whose form wasn't sent", () => {
    renderList([
      {
        ...ACCOUNT,
        websites: [
          {
            ...WEBSITE,
            abilities: [{ ...POSTS_ABILITY, status: "added", placement: null }],
          },
        ],
      },
    ]);

    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("offers one Live switch on posts while their placement is requested", async () => {
    const posts = { ...POSTS_ABILITY, status: "added", placement: "requested" };
    const website = { ...WEBSITE, abilities: [posts] };
    const onSetLive = vi.fn();
    const user = userEvent.setup();
    renderList([{ ...ACCOUNT, websites: [website] }], { onSetLive });
    await openWebsite(user);

    expect(
      within(screen.getByText("Posts").parentElement).getByText("requested"),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("switch", { name: "Posts live for Stevie The Dog" }),
    );

    expect(onSetLive).toHaveBeenCalledWith(posts, website);
  });

  it("offers a requested gallery's Live switch only once Photo Galleries is live", async () => {
    const onSetGalleryLive = vi.fn();
    const user = userEvent.setup();
    const live = {
      ...WEBSITE,
      abilities: [POSTS_ABILITY, { ...GALLERIES_ABILITY, status: "live" }],
    };
    const { unmount } = render(
      <AccountList
        accounts={[ACCOUNT]}
        loading={false}
        error={null}
        onLink={() => {}}
        onSetLive={() => {}}
        onSetGalleryLive={onSetGalleryLive}
      />,
    );
    const name = "Our Interior live on Stevie The Dog";

    expect(screen.queryByRole("switch", { name })).not.toBeInTheDocument();
    unmount();

    renderList([{ ...ACCOUNT, websites: [live] }], { onSetGalleryLive });
    await openWebsite(user);
    await user.click(screen.getByText("Our Interior"));
    await user.click(screen.getByRole("switch", { name }));

    expect(onSetGalleryLive).toHaveBeenCalledWith(live.galleries[0], live);
  });

  it("closes each ability by default, opening to its items, and its Live switch never opens or closes it", async () => {
    const onSetLive = vi.fn();
    const user = userEvent.setup();
    renderList([ACCOUNT], { onSetLive });
    await openWebsite(user);
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
