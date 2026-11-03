// useGalleries (site owner): gallery creation, status changes, deletion and each gallery's
// request form, like usePosts. It fetches nothing, so it exposes just create, setStatus, remove,
// request and editRequest. The dashboard calls them directly and refetches its list (from
// useWebsites) after each; the gallery page changes status and edits its request form through
// useGallery and deletes through remove, so both pages share one request for each.

"use client";

import { useCallback } from "react";
import { apiFetch } from "../_lib/apiFetch";

export function useGalleries() {
  // payload: { websiteId, galleryName, title, copy, status, images }.
  // Returns the created Gallery. Throws the ApiError on failure.
  const create = useCallback(
    (payload) =>
      apiFetch("/api/siteOwner/galleries", { method: "POST", body: payload }),
    [],
  );

  // status: "published" or "draft". Returns the updated Gallery. Throws the ApiError on failure.
  const setStatus = useCallback(
    (id, status) =>
      apiFetch(`/api/siteOwner/galleries/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        body: { status },
      }),
    [],
  );

  // Deletes a gallery (a soft delete on the backend). Resolves once the API answers 204; throws
  // the ApiError on failure. Named remove because delete is a reserved word.
  const remove = useCallback(
    (id) =>
      apiFetch(`/api/siteOwner/galleries/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    [],
  );

  // The gallery's request form: where on the website it should appear. Returns the updated
  // Gallery. Throws the ApiError on failure.
  const request = useCallback(
    (id, requestNote) =>
      apiFetch(`/api/siteOwner/galleries/${encodeURIComponent(id)}/request`, {
        method: "POST",
        body: { requestNote },
      }),
    [],
  );

  // A change of mind: edits the gallery's request form already sent, which puts the galleries
  // ability back to requested. Returns the updated Gallery. Throws the ApiError on failure.
  const editRequest = useCallback(
    (id, requestNote) =>
      apiFetch(`/api/siteOwner/galleries/${encodeURIComponent(id)}/request`, {
        method: "PATCH",
        body: { requestNote },
      }),
    [],
  );

  return { create, setStatus, remove, request, editRequest };
}
