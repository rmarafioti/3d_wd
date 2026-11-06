// useDeletedPosts (site owner): GET /api/siteOwner/posts/deleted, the posts deleted in the last 30
// days, a page at a time. Returns usePagedList's { data, loading, error, refetch } plus hasMore,
// loadMore, loadingMore, loadMoreError.

"use client";

import { usePagedList } from "./usePagedList";

export function useDeletedPosts() {
  return usePagedList("/api/siteOwner/posts/deleted");
}
