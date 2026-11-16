// Tests for SectionLink: the scroll to its section, smooth or instant by the reduced-motion
// setting, the hash in the URL, and focus moved to the section's heading.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SectionLink from "./SectionLink";
import { stubMatchMedia } from "../../../test/helpers";

function renderWithSection() {
  render(
    <>
      <SectionLink id="contact">Contact me</SectionLink>
      <section id="contact">
        <h2 tabIndex={-1}>Let&apos;s make your website do more of the work.</h2>
      </section>
    </>,
  );
}

describe("SectionLink", () => {
  it("scrolls smoothly to its section, puts its hash in the URL and focuses its heading", async () => {
    const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView");
    const user = userEvent.setup();
    renderWithSection();

    await user.click(screen.getByRole("link", { name: "Contact me" }));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });
    expect(scrollIntoView.mock.contexts[0]).toBe(
      document.getElementById("contact"),
    );
    expect(window.location.hash).toBe("#contact");
    expect(
      screen.getByRole("heading", {
        name: "Let's make your website do more of the work.",
      }),
    ).toHaveFocus();
  });

  it("jumps instantly when the device asks for reduced motion", async () => {
    stubMatchMedia(true);
    const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView");
    const user = userEvent.setup();
    renderWithSection();

    await user.click(screen.getByRole("link", { name: "Contact me" }));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto" });
  });
});
