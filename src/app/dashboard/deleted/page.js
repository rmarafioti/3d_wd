// Recently Deleted page (site owner): the posts deleted in the last 30 days, each with a Restore
// button. A Client Component on purpose, since per-user data is only ever fetched client-side.

"use client";

import { useState } from "react";
import { useSiteOwnerData } from "../../_hooks/useSiteOwnerData";
import { useDeletedPosts } from "../../_hooks/useDeletedPosts";
import { usePosts } from "../../_hooks/usePosts";
import DeletedPostTable from "../../_components/DeletedPostTable";
import MessageDialog from "../../_components/MessageDialog";

import styles from "../../_styling/dashPages.module.css";

export default function RecentlyDeletedPage() {
  const websites = useSiteOwnerData();
  const deleted = useDeletedPosts();
  const posts = usePosts();
  // The post whose Restore is in flight, or null.
  const [restoringId, setRestoringId] = useState(null);
  // A failed restore's message, held only while its dialog is open.
  const [restoreError, setRestoreError] = useState(null);

  // No success dialog: the row leaving this list, and the post back on /dashboard, show it. Either
  // way the list is fetched again, since a failure ("Post not found.") means its window has passed.
  async function restore(post) {
    setRestoringId(post.id);
    try {
      await posts.restore(post.id);
      websites.refetch();
    } catch (err) {
      setRestoreError(err.message);
    }
    deleted.refetch();
    setRestoringId(null);
  }

  let content;
  if (deleted.error) content = <p>{deleted.error.message}</p>;
  else if (deleted.loading) content = <p>Loading…</p>;
  else if (deleted.data.length === 0)
    content = <p>No recently deleted posts.</p>;
  else
    content = (
      <DeletedPostTable
        posts={deleted.data}
        showWebsite={websites.data?.length > 1}
        restoringId={restoringId}
        onRestore={restore}
      />
    );

  return (
    <article>
      <section className={styles.siteOwnerAccount}>
        <h1 className={styles.postHeader}>Recently Deleted</h1>
        <p className={styles.postHeader}>
          Deleted posts can be restored for 30 days.
        </p>
        {content}
        {deleted.hasMore && !deleted.error && (
          <button
            type="button"
            onClick={deleted.loadMore}
            disabled={deleted.loadingMore}
            className={styles.loadMore}
          >
            {deleted.loadingMore ? "Loading…" : "Load more"}
          </button>
        )}
        {deleted.loadMoreError && <p>{deleted.loadMoreError.message}</p>}
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
