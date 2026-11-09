// RecentlyDeleted: a role's Recently Deleted page, the items deleted in the last 30 days, ticked
// and restored together, then back to the dashboard. The site owner's lists posts, galleries and
// mail; the admin's, mail only.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDeleted } from "../../_hooks/useDeleted";
import { useDeletedActions } from "../../_hooks/useDeletedActions";
import { useSelection } from "../../_hooks/useSelection";
import { failedMessage } from "../../_lib/bulkResults";
import { HOME_BY_ROLE } from "../../_lib/roles";
import DeletedItemTable, { deletedItemKey } from "./DeletedItemTable";
import MessageDialog from "../dialogs/MessageDialog";
import LoadMoreButton from "../controls/LoadMoreButton";

import styles from "../../_styling/dashPages.module.css";

const NOTE_BY_ROLE = {
  admin: "Deleted messages can be restored for 30 days.",
  site_owner:
    "Deleted posts, galleries and messages can be restored for 30 days.",
};

export default function RecentlyDeleted({ role, showWebsite, onRestored }) {
  const router = useRouter();
  const deleted = useDeleted(role);
  const selection = useSelection(deleted.data, deletedItemKey);
  const { restore } = useDeletedActions(role);
  const [restoring, setRestoring] = useState(false);
  // A failure's message, held only while its dialog is open.
  const [restoreError, setRestoreError] = useState(null);

  // No confirmation (deleting again undoes it) and no success dialog: once everything ticked is
  // back, the user goes back to the dashboard. Partial: if anything failed (a gallery's taken name,
  // a window that has passed), the user stays to read which, and the list is fetched again from the
  // start, since a restored item breaks its cursor.
  async function restoreSelected() {
    const items = selection.selectedItems;
    setRestoring(true);
    try {
      const { restored, failed } = await restore(items);
      if (restored.length > 0) onRestored(restored);
      if (failed.length === 0) {
        router.push(HOME_BY_ROLE[role]);
        return;
      }
      setRestoreError(failedMessage("restore", failed, items));
    } catch (err) {
      setRestoreError(err.message);
    }
    selection.clear();
    deleted.refetch();
    setRestoring(false);
  }

  let content;
  if (deleted.error) content = <p>{deleted.error.message}</p>;
  else if (deleted.loading) content = <p>Loading…</p>;
  else if (deleted.data.length === 0)
    content = <p>Nothing has been deleted in the last 30 days.</p>;
  else
    content = (
      <>
        <button
          type="button"
          onClick={restoreSelected}
          disabled={selection.selectedItems.length === 0 || restoring}
          className={styles.restoreButton}
        >
          {restoring ? "Restoring…" : "Restore"}
        </button>
        <DeletedItemTable
          items={deleted.data}
          showWebsite={showWebsite}
          selection={selection}
        />
      </>
    );

  return (
    <article>
      <section className={styles.siteOwnerAccount}>
        <h1 className={styles.postHeader}>Recently Deleted</h1>
        <p className={styles.postHeader}>{NOTE_BY_ROLE[role]}</p>
        {content}
        <LoadMoreButton list={deleted} />
        {restoreError && (
          <MessageDialog
            message={restoreError}
            onClose={() => setRestoreError(null)}
          />
        )}
      </section>
    </article>
  );
}
