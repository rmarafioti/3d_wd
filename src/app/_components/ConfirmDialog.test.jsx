// Tests for ConfirmDialog, the shared confirmation gate for destructive actions (Delete Post,
// cancelling a post): it shows its message, the confirm button calls onConfirm, Cancel (or its
// cancelLabel) or Esc call onClose, and it has no X.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfirmDialog from "./ConfirmDialog";
import { pressEscape } from "../../test/helpers";

function renderDialog(props = {}) {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  const user = userEvent.setup();
  render(
    <ConfirmDialog
      message="Are you sure?"
      confirmLabel="Delete"
      {...props}
      onConfirm={onConfirm}
      onClose={onClose}
    />,
  );
  return { user, onConfirm, onClose };
}

describe("ConfirmDialog", () => {
  it("opens showing its message", () => {
    renderDialog();

    expect(screen.getByRole("dialog")).toHaveTextContent("Are you sure?");
  });

  it("calls onConfirm from the confirm button, not onClose", async () => {
    const { user, onConfirm, onClose } = renderDialog();

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose from Cancel, not onConfirm", async () => {
    const { user, onConfirm, onClose } = renderDialog();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("names its cancel button by cancelLabel when given", async () => {
    const { user, onClose } = renderDialog({ cancelLabel: "Keep editing" });
    expect(
      screen.queryByRole("button", { name: "Cancel" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Keep editing" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("has no X, so the choice is Cancel or the confirm button", () => {
    renderDialog();

    expect(
      screen.queryByRole("button", { name: "Close" }),
    ).not.toBeInTheDocument();
  });

  it("calls onClose on Esc", () => {
    const { onClose } = renderDialog();

    pressEscape(screen.getByRole("dialog"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
