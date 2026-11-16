// Tests for SectionLink: the eased scroll to its section (instant by the reduced-motion setting,
// stopped by the visitor's own scroll), the URL kept at "/", and focus moved to the heading.

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SectionLink from "./SectionLink";
import { stubAnimationFrames, stubMatchMedia } from "../../../test/helpers";

// The contact section sits 1500px down the page (jsdom lays nothing out), so the scroll takes
// 850ms plus 1500 / 5, 1150ms, and is halfway at 575ms.
function renderWithSection() {
  vi.spyOn(HTMLElement.prototype, "offsetTop", "get").mockImplementation(
    function offsetTop() {
      return this.id === "contact" ? 1500 : 0;
    },
  );
  render(
    <>
      <SectionLink id="contact">Contact me</SectionLink>
      <section id="contact">
        <h2 tabIndex={-1}>Let&apos;s put your story on the big screen.</h2>
      </section>
    </>,
  );
}

describe("SectionLink", () => {
  it("scrolls to its section over a little over a second, keeps the URL with no hash and focuses its heading", async () => {
    const frames = stubAnimationFrames();
    const scroll = vi.spyOn(window, "scrollTo");
    const user = userEvent.setup();
    renderWithSection();

    await user.click(screen.getByRole("link", { name: "Contact me" }));
    frames.runFrame(0);
    frames.runFrame(575);
    const halfway = scroll.mock.lastCall;
    frames.runFrame(1150);

    expect(halfway).toEqual([0, 750]);
    expect(scroll).toHaveBeenLastCalledWith(0, 1500);
    expect(frames.hasPendingFrame()).toBe(false);
    expect(window.location.hash).toBe("");
    expect(
      screen.getByRole("heading", {
        name: "Let's put your story on the big screen.",
      }),
    ).toHaveFocus();
  });

  it("stops scrolling once the visitor scrolls themselves", async () => {
    const frames = stubAnimationFrames();
    const user = userEvent.setup();
    renderWithSection();

    await user.click(screen.getByRole("link", { name: "Contact me" }));
    frames.runFrame(0);
    fireEvent.wheel(window);

    expect(frames.hasPendingFrame()).toBe(false);
  });

  it("jumps instantly when the device asks for reduced motion", async () => {
    stubMatchMedia(true);
    const frames = stubAnimationFrames();
    const scroll = vi.spyOn(window, "scrollTo");
    const user = userEvent.setup();
    renderWithSection();

    await user.click(screen.getByRole("link", { name: "Contact me" }));

    expect(scroll).toHaveBeenCalledOnce();
    expect(scroll).toHaveBeenCalledWith(0, 1500);
    expect(frames.hasPendingFrame()).toBe(false);
  });
});
