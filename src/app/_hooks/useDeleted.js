// useDeleted(role): GET /api/{siteOwner|admin}/deleted, the role's Recently Deleted (posts,
// galleries and mail for a site owner, mail for the admin), a page at a time. Returns
// usePagedList's { data, loading, error, refetch } plus hasMore, loadMore, loadingMore, loadMoreError.

"use client";

import { usePagedList } from "./usePagedList";

export const DELETED_PATH_BY_ROLE = {
  admin: "/api/admin/deleted",
  site_owner: "/api/siteOwner/deleted",
};

export function useDeleted(role) {
  return usePagedList(DELETED_PATH_BY_ROLE[role]);
}
