// Tests for MessageDialog: opens on mount with its message; Close and Esc both call onClose.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MessageDialog from "./MessageDialog";
import { pressEscape } from "../../test/helpers";

describe("MessageDialog", () => {
  it("opens on mount showing the message", () => {
    render(
      <MessageDialog
        message="Post Walk day has been created"
        onClose={() => {}}
      />,
    );

    expect(screen.getByRole("dialog")).toHaveAttribute("open");
    expect(
      screen.getByText("Post Walk day has been created"),
    ).toBeInTheDocument();
  });

  it("calls onClose from its Close button", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<MessageDialog message="Done" onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when Esc is pressed", () => {
    const onClose = vi.fn();
    render(<MessageDialog message="Done" onClose={onClose} />);

    pressEscape(screen.getByRole("dialog"));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
