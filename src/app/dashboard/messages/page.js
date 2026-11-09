// Messages page (site owner): the mailbox, updates and threads with the admin in one list, newest
// first, each with a checkbox to delete it, and "Message Admin". A Client Component, so no per-user data
// is server-rendered.

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GoTriangleRight } from "react-icons/go";
import { useMailbox, mailboxItemKey } from "../../_hooks/useMailbox";
import { useSelection } from "../../_hooks/useSelection";
import { formatMailTime } from "../../_lib/mailTime";
import { useInboxActions } from "../../_hooks/useInboxActions";
import { useNav } from "../../_hooks/useNav";
import Pill from "../../_components/Pill";
import MessageDialog from "../../_components/MessageDialog";
import DeleteSelectedButton from "../../_components/DeleteSelectedButton";
import SelectAllCheckbox from "../../_components/SelectAllCheckbox";
import FormattedMessage from "../../_components/FormattedMessage";
import StartThreadDialog from "../../_components/StartThreadDialog";
import LoadMoreButton from "../../_components/LoadMoreButton";

import styles from "../../_styling/inbox.module.css";

// The pill that says what an item is: an update can't be replied to, a message can.
const PILL_TONE = { update: "plain", message: "purple" };

export default function SiteOwnerMessagesPage() {
  const router = useRouter();
  const mailbox = useMailbox("site_owner");
  const selection = useSelection(mailbox.data, mailboxItemKey);
  const { startThread, markUpdateRead } = useInboxActions("site_owner");
  const { refreshUnread } = useNav();
  // Updates opened on this page, shown as read without fetching the list again.
  const [readIds, setReadIds] = useState([]);
  const [starting, setStarting] = useState(false);
  // A failed delete's message, held only while its dialog is open.
  const [deleteError, setDeleteError] = useState(null);

  function isUnread(item) {
    if (item.type === "message") return item.unread;
    return !item.readAt && !readIds.includes(item.id);
  }

  // The first opening of an unread update marks it read, then the badge counts again. A failure
  // leaves it unread, to be marked the next time it is opened.
  async function handleUpdateToggle(event, update) {
    if (!event.currentTarget.open || !isUnread(update)) return;
    setReadIds((current) => [...current, update.id]);
    try {
      await markUpdateRead(update.id);
      refreshUnread();
    } catch {
      setReadIds((current) => current.filter((id) => id !== update.id));
    }
  }

  // Deleted mail leaves this mailbox only, and the admin keeps their copy; a deleted unread item no
  // longer counts.
  function handleDeleted() {
    selection.clear();
    mailbox.refetch();
    refreshUnread();
  }

  function handleStarted(thread) {
    setStarting(false);
    router.push(`/dashboard/messages/${thread.id}`);
  }

  function itemHeading(item) {
    const unread = isUnread(item);
    const name = item.type === "update" ? item.title : item.subject;
    return (
      <>
        <Pill label={item.type} tone={PILL_TONE[item.type]} />
        {/* An update opens in place, so it has the open / closed marker; a thread is a link. */}
        {item.type === "update" && (
          <GoTriangleRight aria-hidden="true" className={styles.marker} />
        )}
        <span
          className={`${styles.itemTitle} ${unread ? styles.unread : ""}`}
          title={name}
        >
          {name}
        </span>
        <span className={styles.muted}>{formatMailTime(item.date)}</span>
        {/* Unread is the exception, so only it is marked: in the mail badge's green, at the right. */}
        {unread && <Pill label="unread" tone="green" />}
      </>
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
            <div className={styles.controlRow}>
              {/* Outside the update's summary, so ticking it never opens the update. */}
              <span className={styles.selectCell}>
                <input
                  type="checkbox"
                  aria-label={`Select ${item.type === "update" ? item.title : item.subject}`}
                  checked={selection.isSelected(item)}
                  onChange={() => selection.toggle(item)}
                />
              </span>
              {item.type === "update" ? (
                // An update can't be replied to, so it opens in place.
                <details
                  onToggle={(event) => handleUpdateToggle(event, item)}
                  className={styles.controlRowItem}
                >
                  <summary className={styles.itemRow}>
                    {itemHeading(item)}
                  </summary>
                  <FormattedMessage text={item.body} />
                </details>
              ) : (
                <Link
                  href={`/dashboard/messages/${item.id}`}
                  className={`${styles.itemRow} ${styles.controlRowItem}`}
                >
                  {itemHeading(item)}
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    );

  return (
    <article className={styles.inboxPage}>
      <div className={styles.topRow}>
        <h1 className={styles.heading}>Messages</h1>
        <button
          type="button"
          onClick={() => setStarting(true)}
          className={styles.topButton}
        >
          Message Admin
        </button>
      </div>
      {mailbox.data?.length > 0 && (
        <div className={styles.selectionRow}>
          <SelectAllCheckbox
            checked={selection.allSelected}
            indeterminate={selection.someSelected}
            onChange={selection.toggleAll}
          />
          <DeleteSelectedButton
            role="site_owner"
            items={selection.selectedItems}
            onDeleted={handleDeleted}
            onError={setDeleteError}
          />
        </div>
      )}
      {content}
      <LoadMoreButton list={mailbox} />

      {starting && (
        <StartThreadDialog
          title="Message Admin"
          onSubmit={startThread}
          onStarted={handleStarted}
          onClose={() => setStarting(false)}
        />
      )}
      {deleteError && (
        <MessageDialog
          message={deleteError}
          onClose={() => setDeleteError(null)}
        />
      )}
    </article>
  );
}
