// Tests for BackToTop: shown only past the first screen, and its scroll to the top, eased or
// instant by the reduced-motion setting, with focus moved to the hero heading.

import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BackToTop from "./BackToTop";
import { MAIN_CONTENT_ID } from "../../_lib/landingSections";
import { stubAnimationFrames, stubMatchMedia } from "../../../test/helpers";

// The page's hero heading and the button, scrolled to `scrollY` (jsdom's window is 768px tall).
function renderScrolledTo(scrollY) {
  vi.spyOn(window, "scrollY", "get").mockReturnValue(scrollY);
  render(
    <article id={MAIN_CONTENT_ID}>
      <h1 tabIndex={-1}>Now showing: your business.</h1>
      <BackToTop />
    </article>,
  );
}

function scrollTo(scrollY) {
  vi.spyOn(window, "scrollY", "get").mockReturnValue(scrollY);
  act(() => {
    fireEvent.scroll(window);
  });
}

describe("BackToTop", () => {
  it("appears only once the page is scrolled past the first screen", () => {
    renderScrolledTo(0);

    expect(
      screen.queryByRole("button", { name: "Back to top" }),
    ).not.toBeInTheDocument();

    scrollTo(window.innerHeight + 1);

    expect(
      screen.getByRole("button", { name: "Back to top" }),
    ).toBeInTheDocument();

    scrollTo(10);

    expect(
      screen.queryByRole("button", { name: "Back to top" }),
    ).not.toBeInTheDocument();
  });

  it("scrolls to the top over an eased scroll and moves focus to the hero heading", async () => {
    const frames = stubAnimationFrames();
    const scroll = vi.spyOn(window, "scrollTo");
    const user = userEvent.setup();
    renderScrolledTo(2000);

    await user.click(screen.getByRole("button", { name: "Back to top" }));
    frames.runFrame(0);
    frames.runFrame(1400);

    expect(scroll).toHaveBeenLastCalledWith(0, 0);
    expect(frames.hasPendingFrame()).toBe(false);
    expect(
      screen.getByRole("heading", {
        name: "Now showing: your business.",
      }),
    ).toHaveFocus();
  });

  it("jumps instantly to the top when the device asks for reduced motion", async () => {
    stubMatchMedia(true);
    const scroll = vi.spyOn(window, "scrollTo");
    const user = userEvent.setup();
    renderScrolledTo(2000);

    await user.click(screen.getByRole("button", { name: "Back to top" }));

    expect(scroll).toHaveBeenCalledOnce();
    expect(scroll).toHaveBeenCalledWith(0, 0);
  });
});
