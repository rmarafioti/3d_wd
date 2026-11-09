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
// { [doneKey]: [{ type, id }], failed: [{ type, id, message }] }. A request that fails outright
// throws its ApiError, as every mutation does.
async function sendInBatches(path, items, doneKey) {
  const result = { [doneKey]: [], failed: [] };
  for (let start = 0; start < items.length; start += BATCH_SIZE) {
    const batch = items
      .slice(start, start + BATCH_SIZE)
      .map(({ type, id }) => ({ type, id }));
    const data = await apiFetch(path, {
      method: "POST",
      body: { items: batch },
    });
    result[doneKey].push(...data[doneKey]);
    result.failed.push(...data.failed);
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
