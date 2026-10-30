// usePosts (site owner): post creation, status changes from the dashboard's ⋮ menu, and
// deletion. It fetches nothing, so it exposes just create, setStatus and remove; the post list
// itself comes from useWebsites, which the dashboard refetches after each.

"use client";

import { useCallback } from "react";
import { apiFetch } from "../_lib/apiFetch";

export function usePosts() {
  // payload: { websiteId, postName, header, subHeader, postDate, status, body }.
  // Returns the created Post. Throws the ApiError on failure.
  const create = useCallback(
    (payload) =>
      apiFetch("/api/siteOwner/posts", { method: "POST", body: payload }),
    [],
  );

  // status: "published" or "draft". Returns the updated Post. Throws the ApiError on failure.
  const setStatus = useCallback(
    (id, status) =>
      apiFetch(`/api/siteOwner/posts/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        body: { status },
      }),
    [],
  );

  // Deletes a post (a soft delete on the backend). Resolves once the API answers 204; throws the
  // ApiError on failure. Named remove because delete is a reserved word.
  const remove = useCallback(
    (id) =>
      apiFetch(`/api/siteOwner/posts/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    [],
  );

  return { create, setStatus, remove };
}
