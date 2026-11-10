// useUnreadCount(role): the mail badge's count, from GET .../unreadCount (the admin's unread
// threads, the site owner's unread updates and threads). Returns { data, loading, error }.

"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useApiResource } from "./useApiResource";
import { useNav } from "./useNav";

const PATH_BY_ROLE = {
  admin: "/api/admin/threads/unreadCount",
  site_owner: "/api/siteOwner/notifications/unreadCount",
};

// The admin receives no updates, so its count has threads only.
function toCount(counts) {
  return (counts.updates ?? 0) + counts.threads;
}

// Fetched again on every page change and whenever a page marks something read (NavContext's
// refreshUnread); it never polls.
export function useUnreadCount(role) {
  const { data, loading, error, refetch } = useApiResource(PATH_BY_ROLE[role]);
  const pathname = usePathname();
  const { unreadVersion } = useNav();
  // useApiResource already fetches on mount, so only a later change refetches.
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    refetch();
  }, [pathname, unreadVersion, refetch]);

  return { data: data ? toCount(data) : null, loading, error };
}
