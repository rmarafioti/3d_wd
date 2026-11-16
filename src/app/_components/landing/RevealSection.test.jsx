// Tests for RevealSection: a section waits below the screen until it is scrolled into view, fades
// out above once it leaves the top, and with reduced motion is never hidden.

import { describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import RevealSection from "./RevealSection";
import {
  stubIntersectionObserver,
  stubMatchMedia,
} from "../../../test/helpers";

import styles from "../../_styling/landing.module.css";

function renderSection() {
  render(
    <RevealSection id="pricing" className={styles.section}>
      <h2>Pricing made simple. No investigator required.</h2>
    </RevealSection>,
  );
}

// A section has no role of its own without a name, so it is found through its heading.
function section() {
  return screen.getByRole("heading").parentElement;
}

describe("RevealSection", () => {
  it("renders visible, as the server sends it, until the observer places it", () => {
    stubIntersectionObserver();

    renderSection();

    expect(section()).toHaveAttribute("id", "pricing");
    expect(section()).toHaveClass(styles.section);
    expect(section()).not.toHaveClass(styles.revealBelow);
    expect(section()).not.toHaveClass(styles.revealAbove);
  });

  it("waits below the screen until it is scrolled into view, then shows", () => {
    const observer = stubIntersectionObserver();
    renderSection();
    act(() => observer.leaveView(2000));
    const waitedBelow = section().classList.contains(styles.revealBelow);

    act(() => observer.enterView());

    expect(waitedBelow).toBe(true);
    expect(section()).not.toHaveClass(styles.revealBelow);
  });

  it("fades out above once it leaves the top of the screen, and back in when scrolled back", () => {
    const observer = stubIntersectionObserver();
    renderSection();
    act(() => observer.leaveView(-900));
    const fadedAbove = section().classList.contains(styles.revealAbove);

    act(() => observer.enterView());

    expect(fadedAbove).toBe(true);
    expect(section()).not.toHaveClass(styles.revealAbove);
  });

  it("is never hidden when the device asks for reduced motion", () => {
    stubMatchMedia(true);
    const observer = stubIntersectionObserver();
    renderSection();

    act(() => observer.leaveView(2000));

    expect(section()).not.toHaveClass(styles.revealBelow);
  });
});
