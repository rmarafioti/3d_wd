// Tests for PostActionsMenu (docs/flows.md → Post actions menu): closed by default; open, View and
// Edit link to the post page (Edit with ?edit=1), the status item reads "Status to draft" or
// "Status to publish" and hands onStatusChange the other status, and Delete hands the post to
// onDelete; it closes on Esc (focus back on ⋮), on a click outside it, and once an item is picked.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PostActionsMenu from "./PostActionsMenu";

const POST = { id: "p1", postName: "Walk day", status: "published" };

function renderMenu(post = POST) {
  const onStatusChange = vi.fn();
  const onDelete = vi.fn();
  const user = userEvent.setup();
  render(
    <>
      <PostActionsMenu
        post={post}
        onStatusChange={onStatusChange}
        onDelete={onDelete}
      />
      <p>Outside</p>
    </>,
  );
  const button = screen.getByRole("button", { name: "Actions for Walk day" });
  return { user, onStatusChange, onDelete, button };
}

describe("PostActionsMenu", () => {
  it("is closed by default", () => {
    const { button } = renderMenu();

    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("opens with View, Edit, Status and Delete, in that order", async () => {
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
    expect(
      screen.getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual(["View", "Edit", "Status to draft", "Delete"]);
  });

  it("moves a published post to draft from Status, and closes", async () => {
    const { user, onStatusChange, button } = renderMenu();
    await user.click(button);

    await user.click(screen.getByRole("button", { name: "Status to draft" }));

    expect(onStatusChange).toHaveBeenCalledWith(POST, "draft");
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("offers Status to publish on a draft", async () => {
    const draft = { ...POST, status: "draft" };
    const { user, onStatusChange, button } = renderMenu(draft);
    await user.click(button);

    await user.click(screen.getByRole("button", { name: "Status to publish" }));

    expect(onStatusChange).toHaveBeenCalledWith(draft, "published");
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
