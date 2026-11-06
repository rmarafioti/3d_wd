// Tests for useMailbox: the updates and threads merged newest first, an item held back while the
// other list may still hold a newer one, and Load more paging only the list that holds it back.

import { describe, expect, it } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useMailbox } from "./useMailbox";
import { mockFetch } from "../../test/helpers";

const UPDATES = "GET /api/siteOwner/notifications";
const THREADS = "GET /api/siteOwner/threads";

function update(id, createdAt) {
  return {
    id,
    title: `Update ${id}`,
    body: "Hello",
    kind: "general",
    createdAt,
    updatedAt: createdAt,
    readAt: null,
  };
}

function thread(id, lastMessageAt) {
  return {
    id,
    subject: `Thread ${id}`,
    lastMessageAt,
    createdAt: lastMessageAt,
    unread: false,
  };
}

function list(data, nextCursor = null) {
  return { body: { data, nextCursor } };
}

function idsOf(items) {
  return items.map((item) => `${item.type}:${item.id}`);
}

async function renderLoaded() {
  const hook = renderHook(() => useMailbox("site_owner"));
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

describe("useMailbox", () => {
  it("merges updates and threads newest first, each tagged by type", async () => {
    mockFetch({
      [UPDATES]: list([
        update("u1", "2026-11-05T12:00:00.000Z"),
        update("u2", "2026-11-03T12:00:00.000Z"),
      ]),
      [THREADS]: list([thread("t1", "2026-11-04T12:00:00.000Z")]),
    });

    const { result } = await renderLoaded();

    expect(idsOf(result.current.data)).toEqual([
      "update:u1",
      "message:t1",
      "update:u2",
    ]);
    expect(result.current.hasMore).toBe(false);
  });

  it("holds back items older than a list that has more pages, until Load more fetches that list", async () => {
    const { calls } = mockFetch({
      [UPDATES]: list([
        update("u1", "2026-11-05T12:00:00.000Z"),
        update("u2", "2026-11-01T12:00:00.000Z"),
      ]),
      [THREADS]: list([thread("t1", "2026-11-04T12:00:00.000Z")], "t1"),
      [`${THREADS}?cursor=t1`]: list([
        thread("t2", "2026-11-02T12:00:00.000Z"),
      ]),
    });
    const { result } = await renderLoaded();

    // u2 is older than the oldest thread loaded, and the threads' next page may be newer.
    expect(idsOf(result.current.data)).toEqual(["update:u1", "message:t1"]);
    expect(result.current.hasMore).toBe(true);

    act(() => result.current.loadMore());

    await waitFor(() =>
      expect(idsOf(result.current.data)).toEqual([
        "update:u1",
        "message:t1",
        "message:t2",
        "update:u2",
      ]),
    );
    expect(calls.map((call) => call.path)).not.toContain(
      "/api/siteOwner/notifications?cursor=u2",
    );
    expect(result.current.hasMore).toBe(false);
  });
});
