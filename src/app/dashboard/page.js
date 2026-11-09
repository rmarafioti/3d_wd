// Site owner dashboard: the websites' tables, the Create forms, the rows' ⋮ saves and the request
// dialog (the Abilities aside is the layout's). Client-side, so no user data is server-rendered.

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSiteOwnerData } from "../_hooks/useSiteOwnerData";
import { usePosts } from "../_hooks/usePosts";
import { useGalleries } from "../_hooks/useGalleries";
import { useAbilities } from "../_hooks/useAbilities";
import {
  findAbility,
  galleryRequestCopy,
  pendingRequest,
  postsRequestCopy,
} from "../_lib/abilities";
import { deletePostMessage } from "../_lib/postFields";
import { deleteGalleryMessage } from "../_lib/galleryFields";
import PostForm from "../_components/PostForm";
import GalleryForm from "../_components/GalleryForm";
import WebsiteList from "../_components/WebsiteList";
import MessageDialog from "../_components/MessageDialog";
import ConfirmDialog from "../_components/ConfirmDialog";
import AbilityRequestDialog from "../_components/AbilityRequestDialog";

import styles from "../_styling/dashPages.module.css";

export default function DashboardPage() {
  const websites = useSiteOwnerData();
  const router = useRouter();
  const searchParams = useSearchParams();
  const posts = usePosts();
  const galleries = useGalleries();
  const abilities = useAbilities();
  // The form open on top of the page: "post", "gallery" or null.
  const [creating, setCreating] = useState(null);
  // The ?create= value last read, so a Navbar link opens its form whenever it is followed, even
  // with the dashboard already open (adjusting state while rendering, not in an effect).
  const createParam = searchParams.get("create");
  const [readCreate, setReadCreate] = useState(null);
  if (createParam !== readCreate) {
    setReadCreate(createParam);
    if (createParam === "post" || createParam === "gallery") {
      setCreating(createParam);
    }
  }
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

  // A form shows once what it needs has loaded: the websites for a post, and a website with Photo
  // Galleries for a gallery (a ?create=gallery without one opens nothing).
  const postFormOpen = creating === "post" && Boolean(websites.data);
  const galleryFormOpen = creating === "gallery" && galleryWebsites?.length > 0;
  // Once loaded with none, the gallery form is let go, so adding Photo Galleries later doesn't
  // suddenly open it.
  if (creating === "gallery" && galleryWebsites?.length === 0) {
    setCreating(null);
  }

  // Waits while a Create form is open: its save's refetch is what makes it pending.
  const pending =
    postFormOpen || galleryFormOpen ? null : pendingRequest(websites.data);

  // Drops ?create= from the address once read, so a refresh or Back doesn't reopen the form.
  useEffect(() => {
    if (createParam) router.replace("/dashboard");
  }, [createParam, router]);

  // No success dialog: the new row appearing in its table shows it was created. The list keeps its
  // rows while it refetches.
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
    <article>
      <section className={styles.siteOwnerAccount}>
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

        {postFormOpen && (
          <PostForm
            mode="create"
            websites={websites.data}
            onSubmit={posts.create}
            onSuccess={handleCreated}
            onClose={() => setCreating(null)}
          />
        )}
        {galleryFormOpen && (
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
            message={deletePostMessage(deleting.post.postName)}
            confirmLabel="Delete Post"
            onConfirm={confirmDelete}
            onClose={() => setDeleting(null)}
          />
        )}
        {deleting?.gallery && (
          <ConfirmDialog
            message={deleteGalleryMessage(deleting.gallery.galleryName)}
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
    </article>
  );
}
