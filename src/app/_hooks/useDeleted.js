// useDeleted(role): GET /api/{siteOwner|admin}/deleted, the role's Recently Deleted, paged. Returns
// usePagedList's { data, loading, error, refetch } and its paging fields.

"use client";

import { usePagedList } from "./usePagedList";

export const DELETED_PATH_BY_ROLE = {
  admin: "/api/admin/deleted",
  site_owner: "/api/siteOwner/deleted",
};

export function useDeleted(role) {
  return usePagedList(DELETED_PATH_BY_ROLE[role]);
}
