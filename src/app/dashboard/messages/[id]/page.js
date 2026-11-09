// Thread page (site owner): one thread with the admin, and the reply box. A Client Component, so no
// per-user data is server-rendered.

"use client";

import { useParams } from "next/navigation";
import ThreadView from "../../../_components/inbox/ThreadView";

import styles from "../../../_styling/inbox.module.css";

export default function SiteOwnerThreadPage() {
  const { id } = useParams();

  return (
    <article className={styles.inboxPage}>
      <ThreadView role="site_owner" id={id} />
    </article>
  );
}
