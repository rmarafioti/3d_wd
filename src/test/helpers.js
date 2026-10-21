// Test helpers for the browser edges our code touches. mockFetch is the only fake network
// (see CLAUDE.md → Unit Tests): the real apiFetch runs on top of it, so tests cover the actual
// request the app sends and how it reads the response.

import { vi } from "vitest";
import { fireEvent } from "@testing-library/react";

// Replaces global fetch with a route table keyed "METHOD /path", e.g.
//   mockFetch({ "GET /api/admin/accounts": { status: 200, body: { data: [] } } })
// A route value is one of:
//   { status, body }        the response (status defaults to 200; body is sent as JSON, or as
//                           raw text when it is a string)
//   { networkError: true }  fetch rejects, as when the backend can't be reached
//   [route, route, ...]     answered in order; the last one repeats
//   (call) => route         computed per call; may return a Promise to hold the response back
// Returns { calls }: every request as { method, path, headers, credentials, body }, with body
// parsed from JSON, or a FormData body (an upload to Cloudinary) as an object of its entries. An unknown route answers 500 with a message naming it, so a missing route
// shows up in the failing assertion instead of hiding behind the generic error.
function readBody(body) {
  if (body === undefined) return undefined;
  if (body instanceof FormData) return Object.fromEntries(body.entries());
  return JSON.parse(body);
}

export function mockFetch(routes) {
  const calls = [];
  const queues = {};

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url, options = {}) => {
      const method = options.method ?? "GET";
      const key = `${method} ${url}`;
      const call = {
        method,
        path: url,
        headers: options.headers ?? {},
        credentials: options.credentials,
        body: readBody(options.body),
      };
      calls.push(call);

      let route = routes[key];
      if (Array.isArray(route)) {
        queues[key] ??= [...route];
        route = queues[key].length > 1 ? queues[key].shift() : queues[key][0];
      }
      if (typeof route === "function") route = await route(call);
      if (!route) {
        route = {
          status: 500,
          body: { error: { message: `mockFetch: no route for ${key}` } },
        };
      }
      if (route.networkError) throw new TypeError("Failed to fetch");

      const status = route.status ?? 200;
      const body =
        status === 204
          ? null
          : typeof route.body === "string"
            ? route.body
            : JSON.stringify(route.body);
      return new Response(body, { status });
    }),
  );

  return { calls };
}

// A promise the test resolves by hand, for holding a response back (stale-response and
// refetch tests).
export function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

// Replaces window.location with a stub whose assign() is a spy, so the 401 redirect can be
// asserted (jsdom can't navigate, and its own location.assign can't be spied on).
export function stubLocation() {
  const assign = vi.fn();
  vi.stubGlobal("location", { ...window.location, assign });
  return { assign };
}

// Presses Esc on an open dialog the way a browser does: fires a cancelable cancel event, and
// closes the dialog only if nothing prevented it.
export function pressEscape(dialog) {
  const event = new Event("cancel", { cancelable: true });
  dialog.dispatchEvent(event);
  if (!event.defaultPrevented) dialog.close();
}

// Selects text[start, end) in a textarea the way a site owner's drag does: sets the selection
// and fires the select event (user-event can't drag a selection inside a textarea).
export function selectText(textarea, start, end) {
  textarea.focus();
  textarea.setSelectionRange(start, end);
  fireEvent.select(textarea);
}

// Makes every media query report `matches` (true: the phone width useIsPhone looks for), and
// returns setMatches(next) to change it the way resizing the window does, firing "change".
// Restored after each test (restoreMocks in vitest.config.mjs).
export function stubMatchMedia(matches) {
  const state = { matches };
  const listeners = new Set();
  const query = {
    get matches() {
      return state.matches;
    },
    addEventListener: (_, listener) => listeners.add(listener),
    removeEventListener: (_, listener) => listeners.delete(listener),
  };
  vi.spyOn(window, "matchMedia").mockReturnValue(query);
  return {
    setMatches(next) {
      state.matches = next;
      listeners.forEach((listener) => listener());
    },
  };
}

// Stands in for the browser's Image so a test decides when (and whether) an image "loads".
// Returns every load started, as { src, load(width, height), fail() }.
export function stubImageLoading() {
  const loads = [];
  class FakeImage {
    set src(value) {
      loads.push({
        src: value,
        load: (width, height) => {
          this.naturalWidth = width;
          this.naturalHeight = height;
          this.onload();
        },
        fail: () => this.onerror(),
      });
    }
  }
  vi.stubGlobal("Image", FakeImage);
  return loads;
}

// jsdom has no URL.createObjectURL / revokeObjectURL. Each file gets "blob:test/1",
// "blob:test/2", …; returns the revoke spy so a test can check an object URL was let go.
export function stubObjectUrls() {
  let count = 0;
  const revokeObjectURL = vi.fn();
  class FakeURL extends URL {
    static createObjectURL() {
      count += 1;
      return `blob:test/${count}`;
    }
    static revokeObjectURL = revokeObjectURL;
  }
  vi.stubGlobal("URL", FakeURL);
  return { revokeObjectURL };
}

// A picked file of the given type and size in bytes (the bytes themselves are never read).
export function imageFile(name, type = "image/jpeg", size = 1024) {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}
