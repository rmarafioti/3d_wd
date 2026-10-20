// Tests for useIsPhone: it reports the phone-width media query and follows it as the window is
// resized.

import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useIsPhone } from "./useIsPhone";
import { stubMatchMedia } from "../../test/helpers";

describe("useIsPhone", () => {
  it("follows the phone-width media query as it changes", () => {
    const media = stubMatchMedia(false);
    const { result } = renderHook(() => useIsPhone());
    expect(result.current).toBe(false);

    act(() => media.setMatches(true));

    expect(result.current).toBe(true);
  });
});
