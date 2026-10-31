// useGallery(id) (site owner): a single gallery, like usePost.
// Returns { data, loading, error } plus update and setStatus. Both mutations store the Gallery
// the API returns in data, so the page shows the server's copy without a second request.
// setStatus sends through useGalleries, so the gallery page and the dashboard's ⋮ menu share one
// status request.

"use client";

import { useCallback } from "react";
import { apiFetch } from "../_lib/apiFetch";
import { useApiResource } from "./useApiResource";
import { useGalleries } from "./useGalleries";

export function useGallery(id) {
  const path = `/api/siteOwner/galleries/${encodeURIComponent(id)}`;
  const { data, loading, error, setData } = useApiResource(path);
  const { setStatus: sendStatus } = useGalleries();

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

  return { data, loading, error, update, setStatus };
}
