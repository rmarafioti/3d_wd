// Messages page (admin): the mailbox, the updates the admin sent and every site owner's threads in
// one list, newest first, each with a checkbox to delete it. A Client Component, so no per-user
// data is server-rendered.

"use client";

import { useState } from "react";
import Link from "next/link";
import { GoTriangleRight } from "react-icons/go";
import { useMailbox, mailboxItemKey } from "../../_hooks/useMailbox";
import { useSelection } from "../../_hooks/useSelection";
import { formatMailTime } from "../../_lib/mailTime";
import { useInboxActions } from "../../_hooks/useInboxActions";
import { useNav } from "../../_hooks/useNav";
import Pill from "../../_components/controls/Pill";
import ActionsMenu from "../../_components/controls/ActionsMenu";
import ConfirmDialog from "../../_components/dialogs/ConfirmDialog";
import MessageDialog from "../../_components/dialogs/MessageDialog";
import EditUpdateDialog from "../../_components/admin/inbox/EditUpdateDialog";
import FormattedMessage from "../../_components/formatting/FormattedMessage";
import LoadMoreButton from "../../_components/controls/LoadMoreButton";
import DeleteSelectedButton from "../../_components/inbox/DeleteSelectedButton";
import SelectAllCheckbox from "../../_components/controls/SelectAllCheckbox";

import styles from "../../_styling/inbox.module.css";

// The pill that says what an item is, as in the site owner's mailbox.
const PILL_TONE = { update: "plain", message: "purple" };

export default function AdminMessagesPage() {
  const mailbox = useMailbox("admin");
  const selection = useSelection(mailbox.data, mailboxItemKey);
  const { editUpdate, withdrawUpdate } = useInboxActions("admin");
  const { refreshUnread } = useNav();
  // The update whose Edit dialog or Withdraw confirmation is open, or null.
  const [editing, setEditing] = useState(null);
  const [withdrawing, setWithdrawing] = useState(null);
  // A failed withdraw's or delete's message, held only while its dialog is open.
  const [actionError, setActionError] = useState(null);

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
      setActionError(err.message);
    }
  }

  // A deleted update leaves the admin's mailbox only, never the site owners' (that is Withdraw);
  // a deleted unread thread no longer counts.
  function handleDeleted() {
    selection.clear();
    mailbox.refetch();
    refreshUnread();
  }

  // Outside the update's summary, so ticking it never opens the update.
  function checkbox(item, name) {
    return (
      <span className={styles.selectCell}>
        <input
          type="checkbox"
          aria-label={`Select ${name}`}
          checked={selection.isSelected(item)}
          onChange={() => selection.toggle(item)}
        />
      </span>
    );
  }

  function updateRow(update) {
    return (
      // The ⋮ beside the disclosure, so opening the menu never opens the update.
      <div className={styles.controlRow}>
        {checkbox(update, update.title)}
        <details className={styles.controlRowItem}>
          <summary className={styles.itemRow}>
            <Pill label="update" tone={PILL_TONE.update} />
            <GoTriangleRight aria-hidden="true" className={styles.marker} />
            <span className={styles.itemTitle} title={update.title}>
              {update.title}
            </span>
            <span>
              Read by {update.readCount} of {update.recipientCount}
            </span>
            <span className={styles.muted}>
              {formatMailTime(update.createdAt)}
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
          className={styles.menuRowActions}
          listClassName={styles.menuList}
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
      <div className={styles.controlRow}>
        {checkbox(thread, thread.subject)}
        <div className={`${styles.itemRow} ${styles.controlRowItem}`}>
          <Pill label="message" tone={PILL_TONE.message} />
          <Link
            href={`/admin/messages/${thread.id}`}
            className={`${styles.itemTitle} ${thread.unread ? styles.unread : ""}`}
            title={thread.subject}
          >
            {thread.subject}
          </Link>
          <span>{thread.account.name}</span>
          <span className={styles.muted}>
            {formatMailTime(thread.lastMessageAt)}
          </span>
          {/* Unread is the exception, so only it is marked: in the mail badge's green, at the right. */}
          {thread.unread && <Pill label="unread" tone="green" />}
        </div>
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
          <li key={mailboxItemKey(item)} className={styles.listItem}>
            {item.type === "update" ? updateRow(item) : threadRow(item)}
          </li>
        ))}
      </ul>
    );

  return (
    <article className={styles.inboxPage}>
      <div className={styles.topRow}>
        <h1 className={styles.heading}>Messages</h1>
      </div>
      {mailbox.data?.length > 0 && (
        <div className={styles.selectionRow}>
          <SelectAllCheckbox
            checked={selection.allSelected}
            indeterminate={selection.someSelected}
            onChange={selection.toggleAll}
          />
          <DeleteSelectedButton
            role="admin"
            items={selection.selectedItems}
            onDeleted={handleDeleted}
            onError={setActionError}
          />
        </div>
      )}
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
      {actionError && (
        <MessageDialog
          message={actionError}
          onClose={() => setActionError(null)}
        />
      )}
    </article>
  );
}
