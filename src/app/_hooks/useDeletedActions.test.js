// Tests for useDeletedActions: the bulk routes by role, and a selection over the contract's cap of
// 100 sent as several requests whose answers merge, even when a later one fails.

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

  it("keeps the batches already done when a later one fails, listing the rest as failed", async () => {
    const items = updates(BATCH_SIZE + 1);
    mockFetch({
      "POST /api/siteOwner/deleted": [
        { body: { data: { deleted: items.slice(0, 100), failed: [] } } },
        {
          status: 500,
          body: {
            error: { message: "Something went wrong, please try again." },
          },
        },
      ],
    });
    const { result } = renderHook(() => useDeletedActions("site_owner"));

    const answer = await result.current.moveToDeleted(items);

    expect(answer.deleted).toHaveLength(100);
    expect(answer.failed).toEqual([
      {
        type: "update",
        id: "n100",
        message: "Something went wrong, please try again.",
      },
    ]);
  });

  it("throws the ApiError when the first batch fails, since nothing was done", async () => {
    mockFetch({
      "POST /api/siteOwner/deleted": {
        status: 500,
        body: { error: { message: "Something went wrong, please try again." } },
      },
    });
    const { result } = renderHook(() => useDeletedActions("site_owner"));

    await expect(result.current.moveToDeleted(updates(3))).rejects.toThrow(
      "Something went wrong, please try again.",
    );
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
