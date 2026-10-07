// Tests for ConfirmDialog, the gate before a destructive action: the confirm button calls
// onConfirm only; Cancel and Esc call onClose only.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfirmDialog from "./ConfirmDialog";
import { pressEscape } from "../../test/helpers";

function setup() {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  const user = userEvent.setup();
  render(
    <ConfirmDialog
      message="Are you sure you want to archive Walk day? It will be removed from your website."
      confirmLabel="Archive"
      onConfirm={onConfirm}
      onClose={onClose}
    />,
  );
  return { user, onConfirm, onClose };
}

describe("ConfirmDialog", () => {
  it("opens on mount showing the message", () => {
    setup();

    expect(screen.getByRole("dialog")).toHaveAttribute("open");
    expect(
      screen.getByText(
        "Are you sure you want to archive Walk day? It will be removed from your website.",
      ),
    ).toBeInTheDocument();
  });

  it("calls onConfirm, not onClose, from the confirm button", async () => {
    const { user, onConfirm, onClose } = setup();

    await user.click(screen.getByRole("button", { name: "Archive" }));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose, not onConfirm, from Cancel", async () => {
    const { user, onConfirm, onClose } = setup();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("calls onClose when Esc is pressed", () => {
    const { onConfirm, onClose } = setup();

    pressEscape(screen.getByRole("dialog"));

    expect(onClose).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
