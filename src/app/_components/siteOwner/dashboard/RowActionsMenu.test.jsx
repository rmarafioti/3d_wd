// Tests for RowActionsMenu: its items, what each hands back, and how the menu opens and closes.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RowActionsMenu from "./RowActionsMenu";

function renderMenu(status = "published") {
  const onStatusChange = vi.fn();
  const onDelete = vi.fn();
  const user = userEvent.setup();
  render(
    <>
      <RowActionsMenu
        path="/dashboard/post/p1"
        name="Walk day"
        status={status}
        onStatusChange={onStatusChange}
        onDelete={onDelete}
      />
      <p>Outside</p>
    </>,
  );
  const button = screen.getByRole("button", { name: "Actions for Walk day" });
  return { user, onStatusChange, onDelete, button };
}

describe("RowActionsMenu", () => {
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

  it("asks for draft from Status on a published row, and closes", async () => {
    const { user, onStatusChange, button } = renderMenu();
    await user.click(button);

    await user.click(screen.getByRole("button", { name: "Status to draft" }));

    expect(onStatusChange).toHaveBeenCalledWith("draft");
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("offers Status to publish on a draft", async () => {
    const { user, onStatusChange, button } = renderMenu("draft");
    await user.click(button);

    await user.click(screen.getByRole("button", { name: "Status to publish" }));

    expect(onStatusChange).toHaveBeenCalledWith("published");
  });

  it("calls onDelete from Delete, and closes", async () => {
    const { user, onDelete, button } = renderMenu();
    await user.click(button);

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(onDelete).toHaveBeenCalled();
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
