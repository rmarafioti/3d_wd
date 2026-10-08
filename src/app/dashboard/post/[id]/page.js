// Single post view: full post details, Edit Post, Archive Post / Make Post Active.
// A Client Component on purpose: per-user data is only ever fetched client-side.

"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { usePost } from "../../../_hooks/usePost";
import PostForm, { postToFormValues } from "../../../_components/PostForm";
import ConfirmDialog from "../../../_components/ConfirmDialog";
import MessageDialog from "../../../_components/MessageDialog";

export default function PostPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: post, loading, error, update, setStatus } = usePost(id);

  const [editing, setEditing] = useState(false);
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const [statusPending, setStatusPending] = useState(false);
  // The open message dialog: { text, toDashboard }. toDashboard routes to /dashboard on close
  // (a status change); an edit or an error just closes, leaving the post on screen.
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
    setMessage({
      text: `Post ${updated.postName} has been updated`,
      // Stay here: usePost already holds the updated post, so the edit shows straight away.
      toDashboard: false,
    });
  }

  async function changeStatus(active) {
    setConfirmingArchive(false);
    setStatusPending(true);
    try {
      const updated = await setStatus(active);
      setMessage({
        text: `Post ${updated.postName} has been updated to ${active ? "Active" : "Archived"}`,
        toDashboard: true,
      });
    } catch (err) {
      setMessage({ text: err.message, toDashboard: false });
    } finally {
      setStatusPending(false);
    }
  }

  function handleMessageClose() {
    const { toDashboard } = message;
    setMessage(null);
    if (toDashboard) router.push("/dashboard");
  }

  return (
    <>
      <p>{post.websiteName}</p>
      <h1>{post.postName}</h1>
      <p>{post.active ? "active" : "inactive"}</p>

      <button type="button" onClick={() => setEditing(true)}>
        Edit Post
      </button>
      {post.active ? (
        <button
          type="button"
          disabled={statusPending}
          onClick={() => setConfirmingArchive(true)}
        >
          Archive Post
        </button>
      ) : (
        <button
          type="button"
          disabled={statusPending}
          onClick={() => changeStatus(true)}
        >
          Make Post Active
        </button>
      )}

      <dl>
        <dt>Post Date</dt>
        <dd>{post.postDate ?? "—"}</dd>
        <dt>Header</dt>
        <dd>{post.header ?? "—"}</dd>
        <dt>Sub Header</dt>
        <dd>{post.subHeader ?? "—"}</dd>
      </dl>

      <h2>Body</h2>
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

      <h2>Links</h2>
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

      <p>Created: {new Date(post.createdAt).toLocaleString()}</p>
      <p>Last updated: {new Date(post.updatedAt).toLocaleString()}</p>

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
      {confirmingArchive && (
        <ConfirmDialog
          message={`Are you sure you want to archive ${post.postName}? It will be removed from your website.`}
          confirmLabel="Archive"
          onConfirm={() => changeStatus(false)}
          onClose={() => setConfirmingArchive(false)}
        />
      )}
      {message && (
        <MessageDialog message={message.text} onClose={handleMessageClose} />
      )}
    </>
  );
}
