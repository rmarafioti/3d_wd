// Thread page (admin): one thread with a site owner, and the reply box. A Client Component, so no
// per-user data is server-rendered.

"use client";

import { useParams } from "next/navigation";
import ThreadView from "../../../_components/ThreadView";

import styles from "../../../_styling/inbox.module.css";

export default function AdminThreadPage() {
  const { id } = useParams();

  return (
    <article className={styles.inboxPage}>
      <ThreadView role="admin" id={id} />
    </article>
  );
}
