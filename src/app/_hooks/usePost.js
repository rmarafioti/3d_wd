// usePost(id) (site owner): a single post.
// Returns { data, loading, error } plus update and setStatus. Both mutations store the Post the
// API returns in data, so the page shows the server's copy without a second request.

"use client";

import { useCallback } from "react";
import { apiFetch } from "../_lib/apiFetch";
import { useApiResource } from "./useApiResource";

export function usePost(id) {
  const path = `/api/siteOwner/posts/${encodeURIComponent(id)}`;
  const { data, loading, error, setData } = useApiResource(path);

  // payload: the full edit form { postName, body, header, subHeader, postDate, images, links }.
  // Returns the updated Post. Throws the ApiError on failure.
  const update = useCallback(
    async (payload) => {
      const post = await apiFetch(path, { method: "PATCH", body: payload });
      setData(post);
      return post;
    },
    [path, setData],
  );

  // active: true (Make Post Active) or false (Archive Post). Returns the updated Post.
  const setStatus = useCallback(
    async (active) => {
      const post = await apiFetch(`${path}/status`, {
        method: "PATCH",
        body: { active },
      });
      setData(post);
      return post;
    },
    [path, setData],
  );

  return { data, loading, error, update, setStatus };
}
