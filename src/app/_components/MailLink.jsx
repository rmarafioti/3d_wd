// MailLink: the Navbar's mail icon, a link to the signed-in user's messages, with a dot while
// anything is unread (the count is for screen readers only).

"use client";

import Link from "next/link";
import { RxEnvelopeClosed } from "react-icons/rx";
import { useUnreadCount } from "../_hooks/useUnreadCount";
import { MESSAGES_BY_ROLE } from "../_lib/roles";

import styles from "../_styling/navbar.module.css";

export default function MailLink({ role }) {
  const { data: unread } = useUnreadCount(role);
  // A failed count shows no badge; the messages page shows any error itself.
  const hasUnread = unread > 0;

  return (
    <Link
      href={MESSAGES_BY_ROLE[role]}
      aria-label={hasUnread ? `Messages, ${unread} unread` : "Messages"}
      title="Messages"
      className={styles.iconLink}
    >
      <RxEnvelopeClosed aria-hidden="true" />
      {hasUnread && <span aria-hidden="true" className={styles.badge} />}
    </Link>
  );
}
