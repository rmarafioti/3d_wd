// useDeletedActions(role): moveToDeleted (mail into the viewer's Recently Deleted) and restore
// (anything listed there back), each for many items at once. It fetches nothing.

"use client";

import { useCallback } from "react";
import { apiFetch } from "../_lib/apiFetch";
import { DELETED_PATH_BY_ROLE } from "./useDeleted";

// The contract's cap per request (docs/api.md → Validation rules). Select all after Load more can
// tick more, so a larger selection goes as several requests.
export const BATCH_SIZE = 100;

// items: [{ type, id }]. One request per batch, one after another; the answers merge into
// { [doneKey]: [{ type, id }], failed: [{ type, id, message }] }. If the first request fails
// outright it throws its ApiError, as every mutation does, since nothing was done. A later one
// can't throw: the batches before it are done on the backend, so the merged answer comes back with
// every item not yet sent listed as failed, with that error's message.
async function sendInBatches(path, items, doneKey) {
  const result = { [doneKey]: [], failed: [] };
  for (let start = 0; start < items.length; start += BATCH_SIZE) {
    const batch = items
      .slice(start, start + BATCH_SIZE)
      .map(({ type, id }) => ({ type, id }));
    try {
      const data = await apiFetch(path, {
        method: "POST",
        body: { items: batch },
      });
      result[doneKey].push(...data[doneKey]);
      result.failed.push(...data.failed);
    } catch (err) {
      if (start === 0) throw err;
      const unsent = items
        .slice(start)
        .map(({ type, id }) => ({ type, id, message: err.message }));
      result.failed.push(...unsent);
      return result;
    }
  }
  return result;
}

export function useDeletedActions(role) {
  const path = DELETED_PATH_BY_ROLE[role];

  // Mail only (type update or thread), from the viewer's own mailbox; the other side keeps its copy.
  const moveToDeleted = useCallback(
    (items) => sendInBatches(path, items, "deleted"),
    [path],
  );

  // Partial: each item comes back on its own, so one failure (a gallery's taken name) never blocks
  // the rest.
  const restore = useCallback(
    (items) => sendInBatches(`${path}/restore`, items, "restored"),
    [path],
  );

  return { moveToDeleted, restore };
}
