// Messages page (site owner): the mailbox, updates and threads with the admin in one list, newest
// first, and "Message Admin". A Client Component, so no per-user data is server-rendered.

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMailbox } from "../../_hooks/useMailbox";
import { useInboxActions } from "../../_hooks/useInboxActions";
import { useNav } from "../../_hooks/useNav";
import Pill from "../../_components/Pill";
import FormattedMessage from "../../_components/FormattedMessage";
import StartThreadDialog from "../../_components/StartThreadDialog";
import LoadMoreButton from "../../_components/LoadMoreButton";

import styles from "../../_styling/inbox.module.css";

// The pill that says what an item is: an update can't be replied to, a message can.
const PILL_TONE = { update: "plain", message: "purple" };

export default function SiteOwnerMessagesPage() {
  const router = useRouter();
  const mailbox = useMailbox("site_owner");
  const { startThread, markUpdateRead } = useInboxActions("site_owner");
  const { refreshUnread } = useNav();
  // Updates opened on this page, shown as read without fetching the list again.
  const [readIds, setReadIds] = useState([]);
  const [starting, setStarting] = useState(false);

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

  function handleStarted(thread) {
    setStarting(false);
    router.push(`/dashboard/messages/${thread.id}`);
  }

  function itemHeading(item) {
    const unread = isUnread(item);
    return (
      <>
        <Pill label={item.type} tone={PILL_TONE[item.type]} />
        <span className={`${styles.itemTitle} ${unread ? styles.unread : ""}`}>
          {item.type === "update" ? item.title : item.subject}
          {unread && <span className={styles.srOnly}> (unread)</span>}
        </span>
        <span className={styles.muted}>
          {new Date(item.date).toLocaleString()}
        </span>
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
          <li key={`${item.type}-${item.id}`} className={styles.listItem}>
            {item.type === "update" ? (
              // An update can't be replied to, so it opens in place.
              <details onToggle={(event) => handleUpdateToggle(event, item)}>
                <summary className={styles.itemRow}>
                  {itemHeading(item)}
                </summary>
                <FormattedMessage text={item.body} />
              </details>
            ) : (
              <Link
                href={`/dashboard/messages/${item.id}`}
                className={styles.itemRow}
              >
                {itemHeading(item)}
              </Link>
            )}
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
          className={styles.messageAdminButton}
        >
          Message Admin
        </button>
      </div>
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
    </article>
  );
}
