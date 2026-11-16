// Tests for SkipLink: shown on the landing page only, linking to its main content.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SkipLink from "./SkipLink";

const navigation = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

describe("SkipLink", () => {
  it("links the landing page to its main content", () => {
    navigation.pathname = "/";

    render(<SkipLink />);

    expect(
      screen.getByRole("link", { name: "Skip to content" }),
    ).toHaveAttribute("href", "#main-content");
  });

  it("shows nothing on any other page", () => {
    navigation.pathname = "/sign-in";

    render(<SkipLink />);

    expect(
      screen.queryByRole("link", { name: "Skip to content" }),
    ).not.toBeInTheDocument();
  });
});
