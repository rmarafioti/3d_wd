// Site owner dashboard: websites with their post tables, Create a Post, and the shortcuts from
// each row's ⋮ menu that save from here: Status (straight away, then a refetch so the row's pill
// follows) and Delete (its confirmation, then a refetch so the post leaves the table).
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
  const { create, setStatus, remove } = usePosts();
  const [creating, setCreating] = useState(false);
  // The post whose delete is being confirmed, from its ⋮ menu, or null.
  const [deleting, setDeleting] = useState(null);
  // A failed status change's or delete's message, held only while its dialog is open.
  const [actionError, setActionError] = useState(null);

  // No success dialog: the new post appearing in its table shows it was created (Rich decided
  // 2026-10-30). The list keeps its rows while it refetches.
  function handleCreated() {
    setCreating(false);
    websites.refetch();
  }

  // No confirmation: a status change is undone the same way. The row's pill changes once the list
  // has refetched.
  async function changeStatus(post, status) {
    try {
      await setStatus(post.id, status);
      websites.refetch();
    } catch (err) {
      setActionError(err.message);
    }
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
      setActionError(err.message);
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
          onStatusChange={changeStatus}
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
        {actionError && (
          <MessageDialog
            message={actionError}
            onClose={() => setActionError(null)}
          />
        )}
      </section>
    </article>
  );
}
