// Tests for ConfirmDialog, the shared confirmation gate kept for future destructive actions: it
// shows its message, the confirm button calls onConfirm, and Cancel, the X or Esc call onClose.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfirmDialog from "./ConfirmDialog";
import { pressEscape } from "../../test/helpers";

function renderDialog() {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  const user = userEvent.setup();
  render(
    <ConfirmDialog
      message="Are you sure?"
      confirmLabel="Delete"
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

  it("calls onClose from the X, not onConfirm", async () => {
    const { user, onConfirm, onClose } = renderDialog();

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("calls onClose on Esc", () => {
    const { onClose } = renderDialog();

    pressEscape(screen.getByRole("dialog"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
