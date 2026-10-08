// usePosts (site owner): post creation only. It fetches nothing, so it exposes just create;
// the post list itself comes from useWebsites, which the dashboard refetches after a create.

"use client";

import { useCallback } from "react";
import { apiFetch } from "../_lib/apiFetch";

export function usePosts() {
  // payload: { websiteId, postName, header, subHeader, postDate, active, body, links }.
  // Returns the created Post. Throws the ApiError on failure.
  const create = useCallback(
    (payload) =>
      apiFetch("/api/siteOwner/posts", { method: "POST", body: payload }),
    [],
  );

  return { create };
}
