// DeleteSelectedButton: a mailbox's "Delete" for the ticked updates and threads, confirmed first
// when there are two or more. The page shows its errors: a refetch may empty the mailbox and
// unmount this button.

"use client";

import { useState } from "react";
import { useDeletedActions } from "../_hooks/useDeletedActions";
import { failedMessage } from "../_lib/bulkResults";
import ConfirmDialog from "./ConfirmDialog";

import styles from "../_styling/inbox.module.css";

// useMailbox tags a thread "message", as its pill reads; the API calls it a thread.
function toDeletedItem(item) {
  return {
    type: item.type === "message" ? "thread" : "update",
    id: item.id,
    name: item.type === "message" ? item.subject : item.title,
  };
}

export default function DeleteSelectedButton({
  role,
  items,
  onDeleted,
  onError,
}) {
  const { moveToDeleted } = useDeletedActions(role);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // One item isn't confirmed (Recently Deleted restores it); several are, since restoring them is
  // a chore.
  function handleClick() {
    if (items.length > 1) setConfirming(true);
    else deleteSelected();
  }

  // No success dialog: the mailbox shows the result. Items that failed (already gone) are named.
  async function deleteSelected() {
    setConfirming(false);
    setDeleting(true);
    const sent = items.map(toDeletedItem);
    try {
      const { failed } = await moveToDeleted(sent);
      setDeleting(false);
      onDeleted();
      if (failed.length > 0) onError(failedMessage("delete", failed, sent));
    } catch (err) {
      setDeleting(false);
      onError(err.message);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={items.length === 0 || deleting}
        className={`${styles.topButton} ${styles.deleteButton}`}
      >
        {deleting ? "Deleting…" : "Delete"}
      </button>
      {confirming && (
        <ConfirmDialog
          message={`Delete ${items.length} messages? You can restore them for 30 days.`}
          confirmLabel="Delete"
          onConfirm={deleteSelected}
          onClose={() => setConfirming(false)}
        />
      )}
    </>
  );
}
