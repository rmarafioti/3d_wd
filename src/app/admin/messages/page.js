// Messages page (admin): the mailbox, the updates the admin sent and every site owner's threads in
// one list, newest first. A Client Component, so no per-user data is server-rendered.

"use client";

import { useState } from "react";
import Link from "next/link";
import { useMailbox } from "../../_hooks/useMailbox";
import { useInboxActions } from "../../_hooks/useInboxActions";
import Pill from "../../_components/Pill";
import ActionsMenu from "../../_components/ActionsMenu";
import ConfirmDialog from "../../_components/ConfirmDialog";
import MessageDialog from "../../_components/MessageDialog";
import EditUpdateDialog from "../../_components/EditUpdateDialog";
import FormattedMessage from "../../_components/FormattedMessage";
import LoadMoreButton from "../../_components/LoadMoreButton";

import styles from "../../_styling/inbox.module.css";

// The pill that says what an item is, as in the site owner's mailbox.
const PILL_TONE = { update: "plain", message: "purple" };

export default function AdminMessagesPage() {
  const mailbox = useMailbox("admin");
  const { editUpdate, withdrawUpdate } = useInboxActions("admin");
  // The update whose Edit dialog or Withdraw confirmation is open, or null.
  const [editing, setEditing] = useState(null);
  const [withdrawing, setWithdrawing] = useState(null);
  // A failed withdraw's message, held only while its dialog is open.
  const [withdrawError, setWithdrawError] = useState(null);

  async function saveEdit(id, update) {
    await editUpdate(id, update);
    mailbox.refetch();
  }

  // The confirm dialog closes first; on success the mailbox is fetched again without it.
  async function confirmWithdraw() {
    const { id } = withdrawing;
    setWithdrawing(null);
    try {
      await withdrawUpdate(id);
      mailbox.refetch();
    } catch (err) {
      setWithdrawError(err.message);
    }
  }

  function updateRow(update) {
    return (
      // The ⋮ beside the disclosure, so opening the menu never opens the update.
      <div className={styles.updateRow}>
        <details className={styles.updateDetails}>
          <summary className={styles.itemRow}>
            <Pill label="update" tone={PILL_TONE.update} />
            <span className={styles.itemTitle}>{update.title}</span>
            <span>
              Read by {update.readCount} of {update.recipientCount}
            </span>
            <span className={styles.muted}>
              {new Date(update.createdAt).toLocaleString()}
            </span>
          </summary>
          {update.updatedAt !== update.createdAt && (
            <p className={styles.muted}>
              Edited {new Date(update.updatedAt).toLocaleString()}
            </p>
          )}
          <FormattedMessage text={update.body} />
        </details>
        <ActionsMenu
          label={`Actions for ${update.title}`}
          listClassName={styles.updateMenuList}
          items={[
            { label: "Edit", onClick: () => setEditing(update) },
            { label: "Withdraw", onClick: () => setWithdrawing(update) },
          ]}
        />
      </div>
    );
  }

  function threadRow(thread) {
    return (
      // One row: the subject takes the spare width, then who it is with and when.
      <div className={styles.itemRow}>
        <Pill label="message" tone={PILL_TONE.message} />
        <Link
          href={`/admin/messages/${thread.id}`}
          className={`${styles.itemTitle} ${thread.unread ? styles.unread : ""}`}
        >
          {thread.subject}
        </Link>
        <span>{thread.account.name}</span>
        <span className={styles.muted}>
          {new Date(thread.lastMessageAt).toLocaleString()}
        </span>
        {thread.unread && <Pill label="unread" tone="purple" />}
      </div>
    );
  }

  let content;
  if (mailbox.error) content = <p>{mailbox.error.message}</p>;
  else if (mailbox.loading) content = <p>Loading…</p>;
  else if (mailbox.data.length === 0) content = <p>No messages yet.</p>;
  else
    content = (
      <ul className={styles.list}>
        {mailbox.data.map((item) => (
          <li key={`${item.type}-${item.id}`} className={styles.listItem}>
            {item.type === "update" ? updateRow(item) : threadRow(item)}
          </li>
        ))}
      </ul>
    );

  return (
    <article className={styles.inboxPage}>
      <h1 className={styles.heading}>Messages</h1>
      {content}
      <LoadMoreButton list={mailbox} />

      {editing && (
        <EditUpdateDialog
          update={editing}
          editUpdate={saveEdit}
          onClose={() => setEditing(null)}
        />
      )}
      {withdrawing && (
        <ConfirmDialog
          message={`Withdraw "${withdrawing.title}"? It will be removed from every mailbox.`}
          confirmLabel="Withdraw"
          onConfirm={confirmWithdraw}
          onClose={() => setWithdrawing(null)}
        />
      )}
      {withdrawError && (
        <MessageDialog
          message={withdrawError}
          onClose={() => setWithdrawError(null)}
        />
      )}
    </article>
  );
}
