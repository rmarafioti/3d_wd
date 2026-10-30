// usePost(id) (site owner): a single post.
// Returns { data, loading, error } plus update and setStatus. Both mutations store the Post the
// API returns in data, so the page shows the server's copy without a second request. setStatus
// sends through usePosts, so the post page and the dashboard's ⋮ menu share one status request.

"use client";

import { useCallback } from "react";
import { apiFetch } from "../_lib/apiFetch";
import { useApiResource } from "./useApiResource";
import { usePosts } from "./usePosts";

export function usePost(id) {
  const path = `/api/siteOwner/posts/${encodeURIComponent(id)}`;
  const { data, loading, error, setData } = useApiResource(path);
  const { setStatus: sendStatus } = usePosts();

  // payload: the full edit form { postName, header, subHeader, postDate, body }.
  // Returns the updated Post. Throws the ApiError on failure.
  const update = useCallback(
    async (payload) => {
      const post = await apiFetch(path, { method: "PATCH", body: payload });
      setData(post);
      return post;
    },
    [path, setData],
  );

  // status: "published" (the Published switch on) or "draft" (off). Returns the updated Post.
  const setStatus = useCallback(
    async (status) => {
      const post = await sendStatus(id, status);
      setData(post);
      return post;
    },
    [id, sendStatus, setData],
  );

  return { data, loading, error, update, setStatus };
}
