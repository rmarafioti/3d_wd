// usePost(id) (site owner): a single post.
// Returns { data, loading, error } plus update and setStatus. Both mutations store the Post the
// API returns in data, so the page shows the server's copy without a second request.

"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../_lib/apiFetch";

export function usePost(id) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Ignore a response that arrives after this effect was cleaned up
    // (React Strict Mode runs effects twice in development).
    let ignore = false;

    apiFetch(`/api/siteOwner/posts/${encodeURIComponent(id)}`)
      .then((post) => {
        if (ignore) return;
        setData(post);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        // On a 401, apiFetch is already redirecting to /sign-in; keep showing loading.
        if (ignore || err.status === 401) return;
        setError(err);
        setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [id]);

  // payload: the full edit form { postName, body, header, subHeader, postDate, images, links }.
  // Returns the updated Post. Throws the ApiError on failure.
  const update = useCallback(
    async (payload) => {
      const post = await apiFetch(
        `/api/siteOwner/posts/${encodeURIComponent(id)}`,
        { method: "PATCH", body: payload },
      );
      setData(post);
      return post;
    },
    [id],
  );

  // active: true (Make Post Active) or false (Archive Post). Returns the updated Post.
  const setStatus = useCallback(
    async (active) => {
      const post = await apiFetch(
        `/api/siteOwner/posts/${encodeURIComponent(id)}/status`,
        { method: "PATCH", body: { active } },
      );
      setData(post);
      return post;
    },
    [id],
  );

  return { data, loading, error, update, setStatus };
}
