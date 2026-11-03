// Site owner dashboard: each website with its post table and gallery table, Create a Post, Create
// a Gallery, and the shortcuts from each row's ⋮ menu that save from here: Status (straight away,
// then a refetch so the row's pill follows) and Delete (its confirmation, then a refetch so the
// post or gallery leaves its table). The Abilities aside sits over the top right, and galleries
// show only for a website with the Photo Galleries ability. While an ability waits for its request
// form (added, with a post or gallery already saved), the required request dialog is open.
// A Client Component on purpose: per-user data is only ever fetched client-side.

"use client";

import { useState } from "react";
import { useWebsites } from "../_hooks/useWebsites";
import { usePosts } from "../_hooks/usePosts";
import { useGalleries } from "../_hooks/useGalleries";
import { useAbilities } from "../_hooks/useAbilities";
import {
  findAbility,
  galleryRequestCopy,
  pendingRequest,
  postsRequestCopy,
} from "../_lib/abilities";
import PostForm from "../_components/PostForm";
import GalleryForm from "../_components/GalleryForm";
import WebsiteList from "../_components/WebsiteList";
import MessageDialog from "../_components/MessageDialog";
import ConfirmDialog from "../_components/ConfirmDialog";
import AbilitiesAside from "../_components/AbilitiesAside";
import AbilityRequestDialog from "../_components/AbilityRequestDialog";

import styles from "../_styling/dashPages.module.css";

export default function DashboardPage() {
  const websites = useWebsites();
  const posts = usePosts();
  const galleries = useGalleries();
  const abilities = useAbilities();
  // The form open on top of the page: "post", "gallery" or null.
  const [creating, setCreating] = useState(null);
  // What is being deleted, from its row's ⋮ menu, or null: { post } or { gallery }.
  const [deleting, setDeleting] = useState(null);
  // A failed status change's or delete's message, held only while its dialog is open.
  const [actionError, setActionError] = useState(null);

  // Only websites with the Photo Galleries ability can have galleries, so only they are offered to
  // Create a Gallery.
  const galleryWebsites = websites.data?.filter((website) =>
    findAbility(website, "galleries"),
  );
  // A request form's heading, message and request: a gallery's names the gallery, which has its own
  // place on the website; the posts' is the ability's.
  function requestCopy({ website, ability, gallery }) {
    if (gallery) {
      return {
        ...galleryRequestCopy(website.websiteName, gallery),
        onSubmit: (requestNote) => galleries.request(gallery.id, requestNote),
      };
    }
    return {
      ...postsRequestCopy(website),
      onSubmit: (requestNote) => abilities.request(ability.id, requestNote),
    };
  }

  // Waits while a Create form is open: its save's refetch is what makes it pending.
  const pending = creating ? null : pendingRequest(websites.data);

  // No success dialog: the new row appearing in its table shows it was created (Rich decided
  // 2026-10-30). The list keeps its rows while it refetches.
  function handleCreated() {
    setCreating(null);
    websites.refetch();
  }

  // No confirmation: a status change is undone the same way. The row's pill changes once the list
  // has refetched. setStatus is usePosts' or useGalleries'.
  async function changeStatus(setStatus, item, status) {
    try {
      await setStatus(item.id, status);
      websites.refetch();
    } catch (err) {
      setActionError(err.message);
    }
  }

  // The confirm dialog closes first. On success the list refetches, keeping its rows meanwhile,
  // so the post or gallery simply leaves its table.
  async function confirmDelete() {
    const { post, gallery } = deleting;
    setDeleting(null);
    try {
      if (post) await posts.remove(post.id);
      else await galleries.remove(gallery.id);
      websites.refetch();
    } catch (err) {
      setActionError(err.message);
    }
  }

  return (
    <article className={styles.dashboard}>
      <section className={styles.siteOwnerAccount}>
        <div className={styles.createButtons}>
          <button
            type="button"
            disabled={!websites.data}
            onClick={() => setCreating("post")}
            className={styles.createAPost}
          >
            Create a Post
          </button>
          {galleryWebsites?.length > 0 && (
            <button
              type="button"
              onClick={() => setCreating("gallery")}
              className={styles.createAPost}
            >
              Create a Gallery
            </button>
          )}
        </div>

        <h1 className={styles.postHeader}>Your Websites</h1>
        <WebsiteList
          websites={websites.data}
          loading={websites.loading}
          error={websites.error}
          onPostStatusChange={(post, status) =>
            changeStatus(posts.setStatus, post, status)
          }
          onDeletePost={(post) => setDeleting({ post })}
          onGalleryStatusChange={(gallery, status) =>
            changeStatus(galleries.setStatus, gallery, status)
          }
          onDeleteGallery={(gallery) => setDeleting({ gallery })}
        />

        {creating === "post" && (
          <PostForm
            mode="create"
            websites={websites.data}
            onSubmit={posts.create}
            onSuccess={handleCreated}
            onClose={() => setCreating(null)}
          />
        )}
        {creating === "gallery" && (
          <GalleryForm
            mode="create"
            websites={galleryWebsites}
            onSubmit={galleries.create}
            onSuccess={handleCreated}
            onClose={() => setCreating(null)}
          />
        )}
        {deleting?.post && (
          <ConfirmDialog
            message={`Delete ${deleting.post.postName}? It will be removed from your dashboard and your website. This can't be undone.`}
            confirmLabel="Delete Post"
            onConfirm={confirmDelete}
            onClose={() => setDeleting(null)}
          />
        )}
        {deleting?.gallery && (
          <ConfirmDialog
            message={`Delete ${deleting.gallery.galleryName}? It will be removed from your dashboard and your website. This can't be undone.`}
            confirmLabel="Delete Gallery"
            onConfirm={confirmDelete}
            onClose={() => setDeleting(null)}
          />
        )}
        {actionError && (
          <MessageDialog
            message={actionError}
            onClose={() => setActionError(null)}
          />
        )}
        {pending && (
          // Keyed, so the next pending form starts fresh and empty.
          <AbilityRequestDialog
            key={(pending.gallery ?? pending.ability).id}
            {...requestCopy(pending)}
            onSent={websites.refetch}
          />
        )}
      </section>
      {websites.data && (
        <AbilitiesAside websites={websites.data} onChange={websites.refetch} />
      )}
    </article>
  );
}
