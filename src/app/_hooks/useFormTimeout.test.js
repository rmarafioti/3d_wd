// Tests for useFormTimeout (docs/flows.md → Form timeout): onTimeout once 20 hours have passed,
// checked when the tab is shown again (a laptop waking from sleep) as well as every minute, and
// GET /api/auth/me on every return to the tab, so an expired session sends the site owner to
// sign-in. The 20-hour interval check itself is tested through PostForm.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { FORM_TIMEOUT_MS, useFormTimeout } from "./useFormTimeout";
import { mockFetch, stubLocation } from "../../test/helpers";

// Shows or hides the tab the way the browser does when the site owner switches back to it.
function setVisibility(state) {
  vi.spyOn(document, "visibilityState", "get").mockReturnValue(state);
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("useFormTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("times out on returning to the tab once 20 hours have passed, even if no timer ran meanwhile", () => {
    mockFetch({ "GET /api/auth/me": { body: { data: {} } } });
    const onTimeout = vi.fn();
    renderHook(() => useFormTimeout(onTimeout));

    vi.setSystemTime(Date.now() + FORM_TIMEOUT_MS);
    setVisibility("visible");
    setVisibility("visible");

    expect(onTimeout).toHaveBeenCalledOnce();
  });

  it("checks the session on returning to the tab, and not while it is hidden", () => {
    const { calls } = mockFetch({ "GET /api/auth/me": { body: { data: {} } } });
    const onTimeout = vi.fn();
    renderHook(() => useFormTimeout(onTimeout));

    setVisibility("hidden");
    expect(calls).toHaveLength(0);
    setVisibility("visible");

    expect(calls.map((call) => call.path)).toEqual(["/api/auth/me"]);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it("sends the site owner to sign-in when the session has expired", async () => {
    const { assign } = stubLocation();
    mockFetch({
      "GET /api/auth/me": {
        status: 401,
        body: {
          error: { message: "Your session expired, please sign in again." },
        },
      },
    });
    renderHook(() => useFormTimeout(vi.fn()));

    setVisibility("visible");

    await vi.waitFor(() =>
      expect(assign).toHaveBeenCalledWith("/sign-in?expired=1"),
    );
  });

  it("stops checking once the form has closed", () => {
    const { calls } = mockFetch({ "GET /api/auth/me": { body: { data: {} } } });
    const onTimeout = vi.fn();
    const { unmount } = renderHook(() => useFormTimeout(onTimeout));

    unmount();
    vi.setSystemTime(Date.now() + FORM_TIMEOUT_MS);
    setVisibility("visible");
    vi.advanceTimersByTime(60 * 1000);

    expect(calls).toHaveLength(0);
    expect(onTimeout).not.toHaveBeenCalled();
  });
});
