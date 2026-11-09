// Tests for useDeletedActions: the bulk routes by role, and a selection over the contract's cap of
// 100 sent as several requests whose answers merge.

import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDeletedActions, BATCH_SIZE } from "./useDeletedActions";
import { mockFetch } from "../../test/helpers";

function updates(count) {
  return Array.from({ length: count }, (_, index) => ({
    type: "update",
    id: `n${index}`,
  }));
}

describe("useDeletedActions", () => {
  it("sends more than 100 items as batches of 100 and merges the answers", async () => {
    const items = updates(BATCH_SIZE + 50);
    const { calls } = mockFetch({
      "POST /api/siteOwner/deleted": [
        { body: { data: { deleted: items.slice(0, 100), failed: [] } } },
        {
          body: {
            data: {
              deleted: items.slice(100, 149),
              failed: [{ ...items[149], message: "Update not found." }],
            },
          },
        },
      ],
    });
    const { result } = renderHook(() => useDeletedActions("site_owner"));

    const answer = await result.current.moveToDeleted(items);

    const posts = calls.filter((call) => call.method === "POST");
    expect(posts.map((call) => call.body.items.length)).toEqual([100, 50]);
    expect(answer.deleted).toHaveLength(149);
    expect(answer.failed).toEqual([
      { type: "update", id: "n149", message: "Update not found." },
    ]);
  });

  it("restores through the admin's route, sending only each item's type and id", async () => {
    const { calls } = mockFetch({
      "POST /api/admin/deleted/restore": {
        body: {
          data: { restored: [{ type: "thread", id: "t1" }], failed: [] },
        },
      },
    });
    const { result } = renderHook(() => useDeletedActions("admin"));

    await result.current.restore([{ type: "thread", id: "t1", name: "Hi" }]);

    expect(calls[0].body).toEqual({ items: [{ type: "thread", id: "t1" }] });
  });
});
