// Tests for AbilitiesAside: its pills, the ⋮ menu each ability's state allows, saving, Remove's
// confirmation, failures, and editing the posts placement.

import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AbilitiesAside from "./AbilitiesAside";
import { mockFetch } from "../../test/helpers";

const POSTS = {
  id: "ab1",
  kind: "posts",
  status: "live",
  turnedOn: true,
  placement: "live",
  requestNote: "The news page.",
  requestedAt: "2026-11-01T00:00:00.000Z",
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
};
const GALLERIES = {
  ...POSTS,
  id: "ab2",
  kind: "galleries",
  status: "added",
  placement: null,
  requestNote: null,
  requestedAt: null,
};
const STEVIE = {
  id: "w1",
  websiteName: "Stevie The Dog",
  url: "https://www.steviethedog.com",
  active: true,
  abilities: [POSTS],
  posts: [],
  galleries: [],
};

const MENU_ITEMS = ["Edit placement", "+ Add", "Turn On", "Turn Off", "Remove"];

// Opens the ⋮ of one ability in the open aside; returns that ability's menu items' names.
async function openMenu(user, abilityLabel) {
  await user.click(
    screen.getByRole("button", {
      name: `Actions for ${abilityLabel} on Stevie The Dog`,
    }),
  );
  return screen
    .getAllByRole("button")
    .map((button) => button.textContent)
    .filter((name) => MENU_ITEMS.includes(name));
}

function renderAside(websites, onChange = vi.fn()) {
  const user = userEvent.setup();
  render(<AbilitiesAside websites={websites} onChange={onChange} />);
  return { user, onChange };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("AbilitiesAside", () => {
  it("starts closed, and opens to each website's abilities", async () => {
    const { user } = renderAside([STEVIE]);
    const toggle = screen.getByRole("button", { name: "Abilities" });

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Posts")).not.toBeInTheDocument();

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Website: Stevie The Dog")).toBeInTheDocument();
    expect(screen.getByText("Posts")).toBeInTheDocument();
    expect(screen.getByText("Photo Galleries")).toBeInTheDocument();
    expect(screen.getByText("live")).toBeInTheDocument();
  });

  it("reads Add ? and offers only + Add for an ability the website hasn't added", async () => {
    const { user } = renderAside([STEVIE]);
    await user.click(screen.getByRole("button", { name: "Abilities" }));

    expect(screen.getByText("Add ?")).toBeInTheDocument();
    expect(await openMenu(user, "Photo Galleries")).toEqual(["+ Add"]);
  });

  it("offers Edit placement and Turn Off on live posts, and never Remove", async () => {
    const { user } = renderAside([STEVIE]);
    await user.click(screen.getByRole("button", { name: "Abilities" }));

    expect(await openMenu(user, "Posts")).toEqual([
      "Edit placement",
      "Turn Off",
    ]);
  });

  it("reads Turn On ? and offers Turn On while a live ability is turned off", async () => {
    const { user } = renderAside([
      { ...STEVIE, abilities: [{ ...POSTS, turnedOn: false }] },
    ]);
    await user.click(screen.getByRole("button", { name: "Abilities" }));

    expect(screen.getByText("Turn On ?")).toBeInTheDocument();
    expect(await openMenu(user, "Posts")).toEqual([
      "Edit placement",
      "Turn On",
    ]);
  });

  it("offers Turn Off and Remove on live Photo Galleries", async () => {
    const { user } = renderAside([
      { ...STEVIE, abilities: [POSTS, { ...GALLERIES, status: "live" }] },
    ]);
    await user.click(screen.getByRole("button", { name: "Abilities" }));

    expect(await openMenu(user, "Photo Galleries")).toEqual([
      "Turn Off",
      "Remove",
    ]);
  });

  it("offers only Remove on Photo Galleries not yet live, and no menu on posts whose form wasn't sent", async () => {
    const { user } = renderAside([
      {
        ...STEVIE,
        abilities: [
          {
            ...POSTS,
            status: "added",
            placement: null,
            requestNote: null,
            requestedAt: null,
          },
          GALLERIES,
        ],
      },
    ]);
    await user.click(screen.getByRole("button", { name: "Abilities" }));

    expect(screen.getAllByText("added")).toHaveLength(2);
    expect(
      screen.queryByRole("button", {
        name: "Actions for Posts on Stevie The Dog",
      }),
    ).not.toBeInTheDocument();
    expect(await openMenu(user, "Photo Galleries")).toEqual(["Remove"]);
  });

  it("adds Photo Galleries straight away and refetches", async () => {
    const { calls } = mockFetch({
      "POST /api/siteOwner/abilities": {
        status: 201,
        body: { data: GALLERIES },
      },
    });
    const { user, onChange } = renderAside([STEVIE]);
    await user.click(screen.getByRole("button", { name: "Abilities" }));
    await openMenu(user, "Photo Galleries");

    await user.click(screen.getByRole("button", { name: "+ Add" }));

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(calls[0]).toMatchObject({
      method: "POST",
      path: "/api/siteOwner/abilities",
      body: { websiteId: "w1", kind: "galleries" },
    });
  });

  it("turns a live ability off straight away and refetches", async () => {
    const { calls } = mockFetch({
      "PATCH /api/siteOwner/abilities/ab1/turnedOn": {
        body: { data: { ...POSTS, turnedOn: false } },
      },
    });
    const { user, onChange } = renderAside([STEVIE]);
    await user.click(screen.getByRole("button", { name: "Abilities" }));
    await openMenu(user, "Posts");

    await user.click(screen.getByRole("button", { name: "Turn Off" }));

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(calls[0].body).toEqual({ turnedOn: false });
  });

  it("asks before removing Photo Galleries, naming the last day to add it back", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-02T12:00:00"));
    const { calls } = mockFetch({
      "DELETE /api/siteOwner/abilities/ab2": { status: 204, body: "" },
    });
    const { user, onChange } = renderAside([
      { ...STEVIE, abilities: [POSTS, GALLERIES] },
    ]);
    await user.click(screen.getByRole("button", { name: "Abilities" }));
    await openMenu(user, "Photo Galleries");

    await user.click(screen.getByRole("button", { name: "Remove" }));
    const dialog = screen.getByRole("dialog");

    expect(
      within(dialog).getByText(
        "Your galleries will be hidden now and deleted for good after 30 days. Add Photo Galleries again before December 2, 2026 to get them back.",
      ),
    ).toBeInTheDocument();
    expect(calls).toHaveLength(0);

    await user.click(within(dialog).getByRole("button", { name: "Remove" }));

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(calls[0]).toMatchObject({
      method: "DELETE",
      path: "/api/siteOwner/abilities/ab2",
    });
  });

  it("sends nothing when the removal is cancelled", async () => {
    const { calls } = mockFetch({});
    const { user, onChange } = renderAside([
      { ...STEVIE, abilities: [POSTS, GALLERIES] },
    ]);
    await user.click(screen.getByRole("button", { name: "Abilities" }));
    await openMenu(user, "Photo Galleries");

    await user.click(screen.getByRole("button", { name: "Remove" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(calls).toHaveLength(0);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows a failed request in a dialog, without refetching", async () => {
    mockFetch({
      "PATCH /api/siteOwner/abilities/ab1/turnedOn": {
        status: 409,
        body: {
          error: {
            message: "This ability can be turned on or off once it is live.",
          },
        },
      },
    });
    const { user, onChange } = renderAside([STEVIE]);
    await user.click(screen.getByRole("button", { name: "Abilities" }));
    await openMenu(user, "Posts");

    await user.click(screen.getByRole("button", { name: "Turn Off" }));

    expect(
      await screen.findByText(
        "This ability can be turned on or off once it is live.",
      ),
    ).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows a requested pill beside the posts' status only while they wait to be placed", async () => {
    const { user } = renderAside([
      {
        ...STEVIE,
        abilities: [{ ...POSTS, placement: "requested" }, GALLERIES],
      },
    ]);
    await user.click(screen.getByRole("button", { name: "Abilities" }));
    const posts = screen.getByText("Posts").parentElement;
    const galleries = screen.getByText("Photo Galleries").parentElement;

    expect(within(posts).getByText("live")).toBeInTheDocument();
    expect(within(posts).getByText("requested")).toBeInTheDocument();
    expect(within(galleries).queryByText("requested")).not.toBeInTheDocument();
  });

  it("shows one live pill on posts once they are placed live", async () => {
    const { user } = renderAside([STEVIE]);
    await user.click(screen.getByRole("button", { name: "Abilities" }));
    const posts = screen.getByText("Posts").parentElement;

    expect(within(posts).getAllByText("live")).toHaveLength(1);
  });

  it("edits the posts request form, prefilled, and refetches once it is saved", async () => {
    const { calls } = mockFetch({
      "PATCH /api/siteOwner/abilities/ab1/request": {
        body: {
          data: { ...POSTS, placement: "requested", requestNote: "The blog." },
        },
      },
    });
    const { user, onChange } = renderAside([STEVIE]);
    await user.click(screen.getByRole("button", { name: "Abilities" }));
    await openMenu(user, "Posts");
    await user.click(screen.getByRole("button", { name: "Edit placement" }));
    const dialog = screen.getByRole("dialog", {
      name: "Where should your posts go?",
    });
    const note = within(dialog).getByLabelText("Where on your website");
    const submit = within(dialog).getByRole("button", { name: "Submit" });

    expect(note).toHaveValue("The news page.");
    expect(submit).toBeDisabled();

    await user.clear(note);
    await user.type(note, "The blog.");
    await user.click(submit);

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(calls[0].method).toBe("PATCH");
    expect(calls[0].body).toEqual({ requestNote: "The blog." });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("sends nothing when the edit is cancelled", async () => {
    const { calls } = mockFetch({});
    const { user, onChange } = renderAside([STEVIE]);
    await user.click(screen.getByRole("button", { name: "Abilities" }));
    await openMenu(user, "Posts");
    await user.click(screen.getByRole("button", { name: "Edit placement" }));

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(calls).toHaveLength(0);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("refuses a blank note, and shows the backend's message in the dialog", async () => {
    mockFetch({
      "PATCH /api/siteOwner/abilities/ab1/request": {
        status: 409,
        body: {
          error: { message: "This ability hasn't been requested yet." },
        },
      },
    });
    const { user, onChange } = renderAside([STEVIE]);
    await user.click(screen.getByRole("button", { name: "Abilities" }));
    await openMenu(user, "Posts");
    await user.click(screen.getByRole("button", { name: "Edit placement" }));
    const dialog = screen.getByRole("dialog");
    const note = within(dialog).getByLabelText("Where on your website");

    await user.clear(note);
    await user.tab();

    expect(
      within(dialog).getByText("Request note is required."),
    ).toBeInTheDocument();

    await user.type(note, "Somewhere else.");
    await user.click(within(dialog).getByRole("button", { name: "Submit" }));

    expect(
      await within(dialog).findByText(
        "This ability hasn't been requested yet.",
      ),
    ).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
