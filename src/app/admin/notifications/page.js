// Send a Notification page (admin): the form for a site-wide update to every active site owner.
// A Client Component, so no per-user data is server-rendered.

"use client";

import { useRouter } from "next/navigation";
import { useInboxActions } from "../../_hooks/useInboxActions";
import UpdateForm from "../../_components/admin/inbox/UpdateForm";

import styles from "../../_styling/inbox.module.css";

export default function SendNotificationPage() {
  const router = useRouter();
  const { sendUpdate } = useInboxActions("admin");

  return (
    <article className={styles.inboxPage}>
      <h1 className={styles.heading}>Send a Notification</h1>
      <p className={styles.note}>Sent to every active site owner.</p>
      {/* A sent update shows at the top of the mailbox with its read tally, so no success dialog. */}
      <UpdateForm
        submitLabel="Send"
        onSubmit={sendUpdate}
        onSuccess={() => router.push("/admin/messages")}
      />
    </article>
  );
}
