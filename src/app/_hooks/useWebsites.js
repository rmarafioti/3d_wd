// useWebsites (site owner): their active websites, each with its abilities and post and gallery
// summaries. Returns { data, loading, error, refetch }.

"use client";

import { useApiResource } from "./useApiResource";

export function useWebsites() {
  const { data, loading, error, refetch } = useApiResource(
    "/api/siteOwner/websites",
  );
  return { data, loading, error, refetch };
}
