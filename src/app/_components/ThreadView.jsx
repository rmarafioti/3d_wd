// ThreadView: one thread between a site owner and the admin, its messages oldest first and a Reply
// button. Used by both roles' thread pages; opening it marks the thread read.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RxArrowBottomLeft, RxArrowTopRight } from "react-icons/rx";
import { useThread } from "../_hooks/useThread";
import { useInboxActions } from "../_hooks/useInboxActions";
import { useNav } from "../_hooks/useNav";
import FormattedMessage from "./FormattedMessage";
import ReplyDialog from "./ReplyDialog";
import StartThreadDialog from "./StartThreadDialog";
import { HOME_BY_ROLE, MESSAGES_BY_ROLE } from "../_lib/roles";

import styles from "../_styling/inbox.module.css";

// role: the viewer's, "admin" or "site_owner". id: the thread's.
export default function ThreadView({ role, id }) {
  const router = useRouter();
  const thread = useThread(role, id);
  const { startThread, reply, markThreadRead } = useInboxActions(role);
  const { refreshUnread } = useNav();
  // The dialog open over the thread: "reply", "newThread", or null.
  const [dialog, setDialog] = useState(null);

  // Read once it is opened, then the badge counts again. A missing thread shows its own error, so
  // a failed mark needs nothing more.
  useEffect(() => {
    markThreadRead(id)
      .then(refreshUnread)
      .catch(() => {});
  }, [id, markThreadRead, refreshUnread]);

  // A sent reply leaves the thread for the dashboard, with no confirmation to dismiss.
  function handleSent() {
    setDialog(null);
    router.push(HOME_BY_ROLE[role]);
  }

  function handleStarted(started) {
    setDialog(null);
    router.push(`${MESSAGES_BY_ROLE[role]}/${started.id}`);
  }

  if (thread.error) return <p>{thread.error.message}</p>;
  if (thread.loading) return <p>Loading…</p>;

  const { subject, account, messages } = thread.data;
  // The admin's new thread goes to the same site owner; the site owner's always to the admin.
  const startTitle = account ? `Message ${account.name}` : "Message Admin";

  return (
    <>
      <h1 className={styles.heading}>{subject}</h1>
      {account && <p className={styles.muted}>With {account.name}</p>}

      <ol className={styles.messages}>
        {messages.map((item) => {
          const isOwn = item.from === role;
          return (
            <li key={item.id} className={styles.message}>
              <p className={styles.messageMeta}>
                {/* A pill in each side's colour, so the two read apart down the thread. */}
                <span
                  className={`${styles.author} ${isOwn ? styles.sentAuthor : styles.receivedAuthor}`}
                >
                  {/* Which way it went, before the name: out for the viewer's own, in for the
                    other side's, named for screen readers. */}
                  {isOwn ? (
                    <RxArrowTopRight role="img" aria-label="Sent" />
                  ) : (
                    <RxArrowBottomLeft role="img" aria-label="Received" />
                  )}
                  <b>{item.authorName}</b>
                </span>
                <span className={styles.muted}>
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </p>
              <FormattedMessage text={item.body} />
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        onClick={() => setDialog("reply")}
        className={styles.replyButton}
      >
        Reply
      </button>

      {dialog === "reply" && (
        <ReplyDialog
          subject={subject}
          onSubmit={(message) => reply(id, message)}
          onSent={handleSent}
          onStartNew={() => setDialog("newThread")}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "newThread" && (
        <StartThreadDialog
          title={startTitle}
          onSubmit={(payload) =>
            startThread(
              account ? { accountId: account.id, ...payload } : payload,
            )
          }
          onStarted={handleStarted}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );
}
