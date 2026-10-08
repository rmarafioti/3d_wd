// Tests for LinkFields (docs/flows.md → LinkFields): the draft and its Add check, Delete,
// Cancel, the 10-link limit, server messages on the right link, and onReindex on every add and
// delete.

import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LinkFields from "./LinkFields";

const LINK = {
  key: "l1",
  name: "Instagram",
  url: "https://instagram.com/stevie",
};

// LinkFields is controlled; this owns the array the way PostForm does.
function Harness({ initialLinks = [], fieldErrors = {}, onReindex }) {
  const [links, setLinks] = useState(initialLinks);
  return (
    <LinkFields
      links={links}
      setLinks={setLinks}
      fieldErrors={fieldErrors}
      onReindex={onReindex}
    />
  );
}

function setup(props = {}) {
  const onReindex = vi.fn();
  const user = userEvent.setup();
  render(<Harness onReindex={onReindex} {...props} />);
  return { user, onReindex };
}

function many(item, count) {
  return Array.from({ length: count }, (_, i) => ({
    ...item,
    key: `${item.key}-${i}`,
  }));
}

describe("LinkFields", () => {
  it('shows every message when "Add" is pressed on an incomplete draft', async () => {
    const { user, onReindex } = setup();

    await user.click(screen.getByRole("button", { name: "Add link" }));
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.getByText("Link name is required.")).toBeInTheDocument();
    expect(screen.getByText("Link URL is required.")).toBeInTheDocument();
    expect(onReindex).not.toHaveBeenCalled();
  });

  it("adds a valid draft to the list and reindexes", async () => {
    const { user, onReindex } = setup();

    await user.click(screen.getByRole("button", { name: "Add link" }));
    await user.type(screen.getByLabelText("Link Name"), "Instagram");
    await user.type(
      screen.getByLabelText("URL"),
      "https://instagram.com/stevie",
    );
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(
      screen.getByRole("button", { name: "Delete link 1" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add link" }),
    ).toBeInTheDocument();
    expect(onReindex).toHaveBeenCalledOnce();
  });

  it("removes a link with Delete and reindexes", async () => {
    const { user, onReindex } = setup({ initialLinks: [LINK] });

    await user.click(screen.getByRole("button", { name: "Delete link 1" }));

    expect(screen.queryByLabelText("Link Name")).not.toBeInTheDocument();
    expect(onReindex).toHaveBeenCalledOnce();
  });

  it("drops a draft on Cancel without adding it", async () => {
    const { user, onReindex } = setup();
    await user.click(screen.getByRole("button", { name: "Add link" }));
    await user.type(screen.getByLabelText("Link Name"), "Instagram");

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByLabelText("Link Name")).not.toBeInTheDocument();
    expect(onReindex).not.toHaveBeenCalled();
  });

  it("disables adding at 10 links", () => {
    setup({ initialLinks: many(LINK, 10) });

    expect(
      screen.getByRole("button", { name: "Maximum of 10 links" }),
    ).toBeDisabled();
  });

  it("allows adding below the limit", () => {
    setup({ initialLinks: many(LINK, 9) });

    expect(screen.getByRole("button", { name: "Add link" })).toBeEnabled();
  });

  it("shows a server message on the link its path points at", () => {
    setup({
      initialLinks: many(LINK, 2),
      fieldErrors: {
        "links.1.url": "Must be a valid URL starting with https://",
      },
    });

    expect(
      screen.getAllByLabelText("URL")[1].nextElementSibling,
    ).toHaveTextContent("Must be a valid URL starting with https://");
  });

  it("shows a list-level server message above the list", () => {
    setup({ fieldErrors: { links: "A post can have at most 10 links." } });

    expect(
      screen.getByText("A post can have at most 10 links."),
    ).toBeInTheDocument();
  });
});
