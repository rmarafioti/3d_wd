// Recently Deleted page (admin): updates and threads deleted from the admin's mailbox in the last
// 30 days, each with Restore. A Client Component on purpose, since per-user data is fetched client-side.

"use client";

import { useNav } from "../../_hooks/useNav";
import RecentlyDeleted from "../../_components/RecentlyDeleted";

export default function AdminRecentlyDeletedPage() {
  const { refreshUnread } = useNav();

  // A restored thread may be unread, so the mail icon counts again.
  return (
    <RecentlyDeleted
      role="admin"
      showWebsite={false}
      onRestored={refreshUnread}
    />
  );
}
