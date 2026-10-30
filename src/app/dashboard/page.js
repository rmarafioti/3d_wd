// Site owner dashboard: websites with their post tables, Create a Post, and the delete shortcut
// from each row's ⋮ menu (its confirmation, then a refetch so the post leaves the table).
// A Client Component on purpose: per-user data is only ever fetched client-side.

"use client";

import { useState } from "react";
import { useWebsites } from "../_hooks/useWebsites";
import { usePosts } from "../_hooks/usePosts";
import PostForm from "../_components/PostForm";
import PostList from "../_components/PostList";
import MessageDialog from "../_components/MessageDialog";
import ConfirmDialog from "../_components/ConfirmDialog";

import styles from "../_styling/dashPages.module.css";

export default function DashboardPage() {
  const websites = useWebsites();
  const { create, remove } = usePosts();
  const [creating, setCreating] = useState(false);
  // The post whose delete is being confirmed, from its ⋮ menu, or null.
  const [deleting, setDeleting] = useState(null);
  // A failed delete's message, held only while its dialog is open.
  const [deleteError, setDeleteError] = useState(null);

  // No success dialog: the new post appearing in its table shows it was created (Rich decided
  // 2026-10-30). The list keeps its rows while it refetches.
  function handleCreated() {
    setCreating(false);
    websites.refetch();
  }

  // The confirm dialog closes first. On success the list refetches, keeping its rows meanwhile,
  // so the post simply leaves its table.
  async function deletePost() {
    const post = deleting;
    setDeleting(null);
    try {
      await remove(post.id);
      websites.refetch();
    } catch (err) {
      setDeleteError(err.message);
    }
  }

  return (
    <article>
      <section className={styles.siteOwnerAccount}>
        <button
          type="button"
          disabled={!websites.data}
          onClick={() => setCreating(true)}
          className={styles.createAPost}
        >
          Create a Post
        </button>

        <h1 className={styles.postHeader}>Your Posts</h1>
        <PostList
          websites={websites.data}
          loading={websites.loading}
          error={websites.error}
          onDelete={setDeleting}
        />

        {creating && (
          <PostForm
            mode="create"
            websites={websites.data}
            onSubmit={create}
            onSuccess={handleCreated}
            onClose={() => setCreating(false)}
          />
        )}
        {deleting && (
          <ConfirmDialog
            message={`Delete ${deleting.postName}? It will be removed from your dashboard and your website. This can't be undone.`}
            confirmLabel="Delete Post"
            onConfirm={deletePost}
            onClose={() => setDeleting(null)}
          />
        )}
        {deleteError && (
          <MessageDialog
            message={deleteError}
            onClose={() => setDeleteError(null)}
          />
        )}
      </section>
    </article>
  );
}
