// useWebsites (site owner): their own active websites, each with post summaries and gallery
// summaries (each newest first). Also fills the Website dropdown in Create a Post and Create a
// Gallery, and gives the gallery forms the names already taken.
// Returns { data, loading, error, refetch }.

"use client";

import { useApiResource } from "./useApiResource";

export function useWebsites() {
  const { data, loading, error, refetch } = useApiResource(
    "/api/siteOwner/websites",
  );
  return { data, loading, error, refetch };
}
