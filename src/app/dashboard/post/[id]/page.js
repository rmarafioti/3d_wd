// Single post view: full post details, Edit Post, Delete Post, and the Active switch next to the
// status pill. Switching it off (archive) or on (make active) saves straight away, with no
// confirmation and no success dialog: the pill and the switch change once the request succeeds; a
// failure shows a dialog. Delete Post can't be undone from the app, so it asks first
// (ConfirmDialog), then returns to /dashboard once the post is deleted. The dashboard's ⋮ menu
// links here with ?edit=1 to open the Edit form straight away.
// A Client Component on purpose: per-user data is only ever fetched client-side.

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { usePost } from "../../../_hooks/usePost";
import { usePosts } from "../../../_hooks/usePosts";
import PostForm, { postToFormValues } from "../../../_components/PostForm";
import MessageDialog from "../../../_components/MessageDialog";
import ConfirmDialog from "../../../_components/ConfirmDialog";
import Toggle from "../../../_components/Toggle";
import StatusPill from "../../../_components/StatusPill";
import FormattedText from "../../../_components/FormattedText";

import styles from "../../../_styling/postPage.module.css";

export default function PostPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: post, loading, error, update, setStatus } = usePost(id);
  const { remove } = usePosts();

  // ?edit=1 (the ⋮ menu's Edit) opens the form; it shows once the post has loaded.
  const openEditOnLoad = searchParams.get("edit") === "1";
  const [editing, setEditing] = useState(openEditOnLoad);
  const [statusPending, setStatusPending] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  // The open error dialog's text: a failed status change or delete. Closing it leaves the post on
  // screen as it was.
  const [message, setMessage] = useState(null);

  // Drops ?edit=1 from the address once read, so a refresh or Back doesn't reopen the form.
  useEffect(() => {
    if (openEditOnLoad) router.replace(`/dashboard/post/${id}`);
  }, [openEditOnLoad, router, id]);

  if (error?.status === 404) {
    return (
      <>
        <p>Post not found.</p>
        <Link href="/dashboard">Back to dashboard</Link>
      </>
    );
  }
  if (error) return <p>{error.message}</p>;
  if (loading) return <p>Loading…</p>;

  // usePost stores the API's Post on success, which moves the pill and the switch together.
  async function changeStatus(active) {
    setStatusPending(true);
    try {
      await setStatus(active);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setStatusPending(false);
    }
  }

  // The confirm dialog closes first; Delete Post reads "Deleting…" while the request is in flight.
  // The dashboard fetches its list on mount, so the deleted post is no longer listed there.
  async function deletePost() {
    setConfirmingDelete(false);
    setDeletePending(true);
    try {
      await remove(id);
      router.push("/dashboard");
    } catch (err) {
      setDeletePending(false);
      setMessage(err.message);
    }
  }

  return (
    <article>
      <section className={styles.postPage}>
        <p>Website: {post.websiteName}</p>
        <h1>Post Name: {post.postName}</h1>
        <div className={styles.statusRow}>
          <StatusPill active={post.active} className={styles.statusPill} />
          <Toggle
            label="Active"
            offLabel="inactive"
            onLabel="active"
            checked={post.active}
            disabled={statusPending}
            onChange={changeStatus}
          />
        </div>

        <dl>
          <dt className={styles.key}>Post Date:</dt>
          <dd className={styles.value}>{post.postDate ?? "None"}</dd>
          <dt className={styles.key}>Header:</dt>
          <dd className={styles.value}>{post.header ?? "None"}</dd>
          <dt className={styles.key}>Sub Header:</dt>
          <dd className={styles.value}>{post.subHeader ?? "None"}</dd>
        </dl>

        <div className={styles.bodySection}>
          <h2 className={styles.key}>Body</h2>
          {/* Elements have no id and this list is read-only, so the index is a stable key. */}
          {post.body.map((element, index) =>
            element.type === "paragraph" ? (
              // pre-line keeps the line breaks the site owner typed (docs/api.md → Shapes);
              // FormattedText draws its bold, italic and links.
              <p
                key={index}
                className={styles.bodyParagraph}
                style={{ whiteSpace: "pre-line" }}
              >
                <FormattedText text={element.text} />
              </p>
            ) : (
              // Unoptimized, at its stored size: Cloudinary has already scaled it to fit 2500 ×
              // 2500, and no next.config host list is needed.
              <figure key={index} className={styles.postImage}>
                <Image
                  src={element.image.src}
                  width={element.image.width}
                  height={element.image.height}
                  alt={element.image.altText}
                  unoptimized
                />
                {/* The image's alt already gives screen readers this text. */}
                <figcaption aria-hidden="true">
                  <span className={styles.key}>Alt Text:</span>{" "}
                  {element.image.altText}
                </figcaption>
              </figure>
            ),
          )}
        </div>

        <div className={styles.timeStampSection}>
          <p>
            <b>Created:</b> {new Date(post.createdAt).toLocaleString()}
          </p>
          <p>
            <b>Last updated:</b> {new Date(post.updatedAt).toLocaleString()}
          </p>
        </div>

        <div className={styles.actionRow}>
          <button
            type="button"
            disabled={deletePending}
            onClick={() => setEditing(true)}
          >
            Edit Post
          </button>
          <button
            type="button"
            disabled={deletePending}
            onClick={() => setConfirmingDelete(true)}
          >
            {deletePending ? "Deleting…" : "Delete Post"}
          </button>
        </div>

        {editing && (
          <PostForm
            mode="edit"
            websiteId={post.websiteId}
            websiteName={post.websiteName}
            initialValues={postToFormValues(post)}
            onSubmit={update}
            // No success dialog: usePost already holds the API's updated copy, so the page shows
            // the edit as the form closes (Rich decided 2026-10-30).
            onSuccess={() => setEditing(false)}
            onClose={() => setEditing(false)}
          />
        )}
        {confirmingDelete && (
          <ConfirmDialog
            message={`Delete ${post.postName}? It will be removed from your dashboard and your website. This can't be undone.`}
            confirmLabel="Delete Post"
            onConfirm={deletePost}
            onClose={() => setConfirmingDelete(false)}
          />
        )}
        {message && (
          <MessageDialog message={message} onClose={() => setMessage(null)} />
        )}
      </section>
    </article>
  );
}
