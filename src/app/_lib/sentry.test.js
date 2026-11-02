// Tests for _lib/sentry.js (issue #61): Sentry is off without its DSN, an unexpected error reaches
// Sentry scrubbed (the page's path only: no query string, cookies, headers, user or breadcrumbs),
// and an ApiError, which the UI already shows, sends nothing. Events go to a recording transport
// in place of Sentry's network.

import { afterEach, describe, expect, it, vi } from "vitest";
import * as Sentry from "@sentry/browser";
import { ApiError } from "./apiFetch";
import { initSentry, reportError } from "./sentry";

const DSN = "https://publickey@o123.ingest.us.sentry.io/456";

// Starts Sentry with a transport that keeps each event's payload instead of sending it.
function startRecording() {
  const events = [];
  initSentry({
    transport: () => ({
      send: async (envelope) => {
        for (const [itemHeader, payload] of envelope[1]) {
          if (itemHeader.type === "event") events.push(payload);
        }
        return {};
      },
      flush: async () => true,
    }),
  });
  return events;
}

afterEach(async () => {
  await Sentry.close();
  Sentry.getCurrentScope().setClient(undefined);
  vi.unstubAllEnvs();
  document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  window.history.replaceState({}, "", "/");
});

describe("sentry", () => {
  it("stays off and sends nothing without a DSN", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    const events = startRecording();

    reportError(new Error("Something broke"));
    await Sentry.flush();

    expect(Sentry.isInitialized()).toBe(false);
    expect(events).toEqual([]);
  });

  it("sends an unexpected error with the page's path only", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", DSN);
    window.history.replaceState({}, "", "/dashboard/post/p1?edit=1");
    document.cookie = "session=secret-session-token";
    const events = startRecording();
    console.info("typed post text");

    reportError(new Error("Something broke"));
    await Sentry.flush();

    expect(events).toHaveLength(1);
    const [event] = events;
    expect(event.exception.values[0].value).toBe("Something broke");
    expect(event.request).toEqual({
      url: "http://localhost:3000/dashboard/post/p1",
    });
    expect(event.user).toBeUndefined();
    expect(event.breadcrumbs).toBeUndefined();
    const sent = JSON.stringify(event);
    expect(sent).not.toContain("edit=1");
    expect(sent).not.toContain("secret-session-token");
    expect(sent).not.toContain("typed post text");
  });

  it("never sends an ApiError, which the UI already shows", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", DSN);
    const events = startRecording();

    reportError(
      new ApiError("Please fix the highlighted fields.", 400, {
        postName: "Post name is required.",
      }),
    );
    await Sentry.flush();

    expect(events).toEqual([]);
  });
});
