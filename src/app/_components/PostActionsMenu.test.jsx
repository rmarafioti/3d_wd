// Tests for PostActionsMenu (docs/flows.md → Post actions menu): closed by default; open, View and
// Edit link to the post page (Edit with ?edit=1) and Delete hands the post to onDelete; it closes
// on Esc (focus back on ⋮), on a click outside it, and once an item is picked.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PostActionsMenu from "./PostActionsMenu";

const POST = { id: "p1", postName: "Walk day" };

function renderMenu() {
  const onDelete = vi.fn();
  const user = userEvent.setup();
  render(
    <>
      <PostActionsMenu post={POST} onDelete={onDelete} />
      <p>Outside</p>
    </>,
  );
  const button = screen.getByRole("button", { name: "Actions for Walk day" });
  return { user, onDelete, button };
}

describe("PostActionsMenu", () => {
  it("is closed by default", () => {
    const { button } = renderMenu();

    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("opens with View and Edit linking to the post page, and Delete", async () => {
    const { user, button } = renderMenu();

    await user.click(button);

    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute(
      "href",
      "/dashboard/post/p1",
    );
    expect(screen.getByRole("link", { name: "Edit" })).toHaveAttribute(
      "href",
      "/dashboard/post/p1?edit=1",
    );
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("hands the post to onDelete from Delete, and closes", async () => {
    const { user, onDelete, button } = renderMenu();
    await user.click(button);

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(onDelete).toHaveBeenCalledWith(POST);
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("closes on Esc and puts focus back on the ⋮ button", async () => {
    const { user, button } = renderMenu();
    await user.click(button);
    await user.tab();

    await user.keyboard("{Escape}");

    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveFocus();
  });

  it("closes on a click outside it", async () => {
    const { user, button } = renderMenu();
    await user.click(button);

    await user.click(screen.getByText("Outside"));

    expect(button).toHaveAttribute("aria-expanded", "false");
  });
});
