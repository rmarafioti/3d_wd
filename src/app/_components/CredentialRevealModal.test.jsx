// Tests for CredentialRevealModal, the one-time reveal: all four values and the warning, Esc
// blocked, Copy all's exact text, and closing only through its Close button.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CredentialRevealModal from "./CredentialRevealModal";
import { pressEscape } from "../../test/helpers";

const WEBSITE = {
  websiteName: "Stevie The Dog",
  url: "https://www.steviethedog.com",
};
const CREDENTIALS = { apiKey: "key_123", webhookSecret: "secret_456" };

function setup() {
  const onClose = vi.fn();
  const user = userEvent.setup();
  render(
    <CredentialRevealModal
      website={WEBSITE}
      credentials={CREDENTIALS}
      onClose={onClose}
    />,
  );
  return { user, onClose };
}

describe("CredentialRevealModal", () => {
  it("opens showing the warning and all four values", () => {
    setup();

    expect(screen.getByRole("dialog")).toHaveAttribute("open");
    expect(
      screen.getByText("Copy these now — they will never be shown again."),
    ).toBeInTheDocument();
    for (const value of [
      "Stevie The Dog",
      "https://www.steviethedog.com",
      "key_123",
      "secret_456",
    ]) {
      expect(screen.getByText(value)).toBeInTheDocument();
    }
  });

  it("stays open when Esc is pressed", () => {
    const { onClose } = setup();
    const dialog = screen.getByRole("dialog");

    pressEscape(dialog);

    expect(dialog).toHaveAttribute("open");
    expect(onClose).not.toHaveBeenCalled();
  });

  it('copies all four values as "Label: value" lines', async () => {
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: "Copy all" }));

    expect(await navigator.clipboard.readText()).toBe(
      [
        "Website Name: Stevie The Dog",
        "Website Url: https://www.steviethedog.com",
        "API KEY: key_123",
        "Webhook Secret: secret_456",
      ].join("\n"),
    );
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
  });

  it("closes and calls onClose from its Close button", async () => {
    const { user, onClose } = setup();
    const dialog = screen.getByRole("dialog");

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(dialog).not.toHaveAttribute("open");
    expect(onClose).toHaveBeenCalledOnce();
  });
});
