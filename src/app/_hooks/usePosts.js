// usePosts (site owner): post creation, status changes and deletion. It fetches nothing, so it
// exposes just create, setStatus and remove. The dashboard calls them directly and refetches its
// list (from useWebsites) after each; the post page changes status through usePost and deletes
// through remove, so both pages share one status request and one delete request.

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
