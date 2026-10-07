// useAllWebsites (admin): every active website; powers WebsitePicker.
// Returns { data, loading, error, refetch }.

"use client";

import { useApiResource } from "./useApiResource";

export function useAllWebsites() {
  const { data, loading, error, refetch } = useApiResource(
    "/api/admin/websites",
  );
  return { data, loading, error, refetch };
}
