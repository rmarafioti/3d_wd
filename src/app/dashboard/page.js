// Site owner dashboard: websites with their post lists, and Create a Post.
// A Client Component on purpose: per-user data is only ever fetched client-side.

"use client";

import { useState } from "react";
import { useWebsites } from "../_hooks/useWebsites";
import { usePosts } from "../_hooks/usePosts";
import PostForm from "../_components/PostForm";
import PostList from "../_components/PostList";
import MessageDialog from "../_components/MessageDialog";

export default function DashboardPage() {
  const websites = useWebsites();
  const { create } = usePosts();
  const [creating, setCreating] = useState(false);
  // The created post's name, held only while the success dialog is open.
  const [createdName, setCreatedName] = useState(null);

  function handleCreated(post) {
    setCreating(false);
    setCreatedName(post.postName);
  }

  function handleCreatedClose() {
    setCreatedName(null);
    // The list refetches only now, as the flow specifies, so the new post appears.
    websites.refetch();
  }

  return (
    <>
      <h1>Dashboard</h1>

      <button
        type="button"
        disabled={!websites.data}
        onClick={() => setCreating(true)}
      >
        Create a Post
      </button>

      <PostList
        websites={websites.data}
        loading={websites.loading}
        error={websites.error}
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
      {createdName && (
        <MessageDialog
          message={`Post ${createdName} has been created`}
          onClose={handleCreatedClose}
        />
      )}
    </>
  );
}
