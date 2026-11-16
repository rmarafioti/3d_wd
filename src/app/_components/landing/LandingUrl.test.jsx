// Tests for LandingUrl: a section hash is cleared from the URL and the browser stops restoring the
// scroll position while the landing page is open, so a refresh starts at the top.

import { afterEach, describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import LandingUrl from "./LandingUrl";

afterEach(() => {
  window.history.replaceState(null, "", "/");
  window.history.scrollRestoration = "auto";
});

describe("LandingUrl", () => {
  it("clears a section hash from the URL, keeping the path", () => {
    window.history.replaceState(null, "", "/#pricing");

    render(<LandingUrl />);

    expect(window.location.hash).toBe("");
    expect(window.location.pathname).toBe("/");
  });

  it("turns off the browser's scroll restoring while the page is open, and back on when it leaves", () => {
    const { unmount } = render(<LandingUrl />);
    const whileOpen = window.history.scrollRestoration;

    unmount();

    expect(whileOpen).toBe("manual");
    expect(window.history.scrollRestoration).toBe("auto");
  });
});
