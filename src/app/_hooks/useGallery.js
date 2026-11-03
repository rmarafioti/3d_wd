// useGallery(id) (site owner): a single gallery, like usePost.
// Returns { data, loading, error } plus update, setStatus and editRequest. Each stores the Gallery
// the API returns in data, so the page shows the server's copy without a second request.
// setStatus and editRequest send through useGalleries, so the gallery page and the dashboard
// share one request for each.

"use client";

import { useCallback } from "react";
import { apiFetch } from "../_lib/apiFetch";
import { useApiResource } from "./useApiResource";
import { useGalleries } from "./useGalleries";

export function useGallery(id) {
  const path = `/api/siteOwner/galleries/${encodeURIComponent(id)}`;
  const { data, loading, error, setData } = useApiResource(path);
  const { setStatus: sendStatus, editRequest: sendEditRequest } =
    useGalleries();

  // payload: the full edit form { galleryName, title, copy, images }.
  // Returns the updated Gallery. Throws the ApiError on failure.
  const update = useCallback(
    async (payload) => {
      const gallery = await apiFetch(path, { method: "PATCH", body: payload });
      setData(gallery);
      return gallery;
    },
    [path, setData],
  );

  // status: "published" (the Published switch on) or "draft" (off). Returns the updated Gallery.
  const setStatus = useCallback(
    async (status) => {
      const gallery = await sendStatus(id, status);
      setData(gallery);
      return gallery;
    },
    [id, sendStatus, setData],
  );

  // A change of mind about where the gallery goes, once its request form was sent. Returns the
  // updated Gallery.
  const editRequest = useCallback(
    async (requestNote) => {
      const gallery = await sendEditRequest(id, requestNote);
      setData(gallery);
      return gallery;
    },
    [id, sendEditRequest, setData],
  );

  return { data, loading, error, update, setStatus, editRequest };
}
