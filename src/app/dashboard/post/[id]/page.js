// Single post view: full post details, Edit Post, and the Active switch next to the status pill.
// Switching it off (archive) or on (make active) saves straight away, with no confirmation and no
// success dialog: the pill and the switch change once the request succeeds; a failure shows a dialog.
// A Client Component on purpose: per-user data is only ever fetched client-side.

"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { usePost } from "../../../_hooks/usePost";
import PostForm, { postToFormValues } from "../../../_components/PostForm";
import MessageDialog from "../../../_components/MessageDialog";
import Toggle from "../../../_components/Toggle";
import StatusPill from "../../../_components/StatusPill";

import styles from "../../../_styling/postPage.module.css";

export default function PostPage() {
  const { id } = useParams();
  const { data: post, loading, error, update, setStatus } = usePost(id);

  const [editing, setEditing] = useState(false);
  const [statusPending, setStatusPending] = useState(false);
  // The open message dialog's text (an edit's success, or a failed status change). Closing it
  // leaves the post on screen: usePost already holds the API's updated copy.
  const [message, setMessage] = useState(null);

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

  function handleEdited(updated) {
    setEditing(false);
    setMessage(`Post ${updated.postName} has been updated`);
  }

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
          <dd className={styles.value}>{post.postDate ?? "—"}</dd>
          <dt className={styles.key}>Header:</dt>
          <dd className={styles.value}>{post.header ?? "—"}</dd>
          <dt className={styles.key}>Sub Header:</dt>
          <dd className={styles.value}>{post.subHeader ?? "—"}</dd>
        </dl>

        <div className={styles.bodySection}>
          <h2 className={styles.key}>Body</h2>
          {/* Elements have no id and this list is read-only, so the index is a stable key. */}
          {post.body.map((element, index) =>
            element.type === "paragraph" ? (
              // pre-line keeps the line breaks the site owner typed (docs/api.md → Shapes).
              <p key={index} style={{ whiteSpace: "pre-line" }}>
                {element.text}
              </p>
            ) : (
              <p key={index}>
                <a
                  href={element.image.src}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {element.image.src}
                </a>{" "}
                — {element.image.altText} — {element.image.width} ×{" "}
                {element.image.height}
              </p>
            ),
          )}
        </div>
        <div className={styles.linksSection}>
          <h3>Links</h3>
          {post.links.length === 0 ? (
            <p>No links.</p>
          ) : (
            <ul>
              {post.links.map((link) => (
                <li key={link.id}>
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    {link.name}
                  </a>{" "}
                  — {link.url}
                </li>
              ))}
            </ul>
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

        <button type="button" onClick={() => setEditing(true)}>
          Edit Post
        </button>

        {editing && (
          <PostForm
            mode="edit"
            websiteName={post.websiteName}
            initialValues={postToFormValues(post)}
            onSubmit={update}
            onSuccess={handleEdited}
            onClose={() => setEditing(false)}
          />
        )}
        {message && (
          <MessageDialog message={message} onClose={() => setMessage(null)} />
        )}
      </section>
    </article>
  );
}
