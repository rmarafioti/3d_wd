// Tests for Toggle, the shared on/off switch: an accessible switch reporting its state, its
// off / on words either side, asking for the opposite value on click or keyboard, inert while
// disabled, and never submitting its form.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Toggle from "./Toggle";

describe("Toggle", () => {
  it("is a switch named by its label that reports its state", () => {
    render(<Toggle label="Active" checked onChange={() => {}} />);

    expect(screen.getByRole("switch", { name: "Active" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("shows the off and on words either side, hidden from screen readers", () => {
    render(
      <Toggle
        label="Active"
        offLabel="inactive"
        onLabel="active"
        checked
        onChange={() => {}}
      />,
    );

    const [off, on] = [
      screen.getByText("inactive"),
      screen.getByText("active"),
    ];
    const toggle = screen.getByRole("switch", { name: "Active" });
    expect(off).toHaveAttribute("aria-hidden", "true");
    expect(on).toHaveAttribute("aria-hidden", "true");
    expect(off.compareDocumentPosition(toggle)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(toggle.compareDocumentPosition(on)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("asks for the opposite value when clicked", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Toggle label="Active" checked onChange={onChange} />);

    await user.click(screen.getByRole("switch", { name: "Active" }));

    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("toggles with Space and Enter from the keyboard", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Toggle label="Active" checked={false} onChange={onChange} />);

    await user.tab();
    await user.keyboard(" ");
    await user.keyboard("{Enter}");

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith(true);
  });

  it("does nothing while disabled", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Toggle label="Active" checked onChange={onChange} disabled />);

    await user.click(screen.getByRole("switch", { name: "Active" }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("never submits the form it sits inside", async () => {
    const onSubmit = vi.fn((event) => event.preventDefault());
    const user = userEvent.setup();
    render(
      <form onSubmit={onSubmit}>
        <Toggle label="Active" checked onChange={() => {}} />
      </form>,
    );

    await user.click(screen.getByRole("switch", { name: "Active" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
