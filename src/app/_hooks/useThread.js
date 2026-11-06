// useThread(role, id): GET /api/admin/threads/:id or /api/siteOwner/threads/:id, one thread with
// its messages, oldest first. Returns { data, loading, error }.

"use client";

import { useApiResource } from "./useApiResource";
import { THREADS_PATH_BY_ROLE } from "./useInboxActions";

export function useThread(role, id) {
  const { data, loading, error } = useApiResource(
    `${THREADS_PATH_BY_ROLE[role]}/${encodeURIComponent(id)}`,
  );
  return { data, loading, error };
}
