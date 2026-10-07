// useWebsites (site owner): their own active websites, each with post summaries (newest
// first). Also fills the Website dropdown in Create a Post.
// Returns { data, loading, error, refetch }.

"use client";

import { useApiResource } from "./useApiResource";

export function useWebsites() {
  const { data, loading, error, refetch } = useApiResource(
    "/api/siteOwner/websites",
  );
  return { data, loading, error, refetch };
}
