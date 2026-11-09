// Recently Deleted page (site owner): posts, galleries and mail deleted in the last 30 days, each
// with Restore. A Client Component on purpose, since per-user data is only ever fetched client-side.

"use client";

import { useSiteOwnerData } from "../../_hooks/useSiteOwnerData";
import { useNav } from "../../_hooks/useNav";
import RecentlyDeleted from "../../_components/RecentlyDeleted";

export default function RecentlyDeletedPage() {
  const websites = useSiteOwnerData();
  const { refreshUnread } = useNav();

  // restored: [{ type, id }]. A restored post or gallery is back in the websites the dashboard and
  // the Abilities aside read; restored mail may be unread, so the mail icon counts again.
  function handleRestored(restored) {
    const types = restored.map((item) => item.type);
    if (types.includes("post") || types.includes("gallery")) websites.refetch();
    if (types.includes("update") || types.includes("thread")) refreshUnread();
  }

  return (
    <RecentlyDeleted
      role="site_owner"
      showWebsite={websites.data?.length > 1}
      onRestored={handleRestored}
    />
  );
}
