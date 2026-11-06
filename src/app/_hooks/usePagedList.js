// usePagedList(path): the cursor-paged GET behind the list hooks, never called by a component.
// Returns { data, loading, error, refetch } plus hasMore, loadMore, loadingMore, loadMoreError.

"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../_lib/apiFetch";

// Its own fetch rather than useApiResource, which holds a single response and can't append pages.
export function usePagedList(path) {
  const [list, setList] = useState(null); // { data, nextCursor }
  const [error, setError] = useState(null);
  const [more, setMore] = useState(null); // { loading, error }, the latest Load more
  // Bumping this key fetches the list again from the start; the rows stay visible meanwhile.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    // Ignore a response that arrives after this effect was cleaned up (a newer refetch, or React
    // Strict Mode running the effect twice in development).
    let ignore = false;

    apiFetch(path, { paginated: true })
      .then((result) => {
        if (ignore) return;
        setList(result);
        setError(null);
        setMore(null);
      })
      .catch((err) => {
        // On a 401, apiFetch is already redirecting to /sign-in; keep showing loading.
        if (ignore || err.status === 401) return;
        setError(err);
      });

    return () => {
      ignore = true;
    };
  }, [path, reloadKey]);

  // From the start, never from a cursor: after a change the item a cursor names may have moved
  // (a restored post, a thread with a new message) or gone (docs/api.md → Notes).
  const refetch = useCallback(() => setReloadKey((key) => key + 1), []);

  const loadMore = useCallback(async () => {
    const from = list;
    if (!from?.nextCursor) return;
    setMore({ loading: true, error: null });
    try {
      const next = await apiFetch(
        `${path}?cursor=${encodeURIComponent(from.nextCursor)}`,
        { paginated: true },
      );
      // Append only onto the list this cursor came from; a refetch may have replaced it meanwhile.
      setList((latest) =>
        latest === from
          ? {
              data: [...latest.data, ...next.data],
              nextCursor: next.nextCursor,
            }
          : latest,
      );
      setMore(null);
    } catch (err) {
      if (err.status === 401) return;
      setMore({ loading: false, error: err });
    }
  }, [list, path]);

  return {
    data: list?.data ?? null,
    loading: !list && !error,
    error,
    refetch,
    hasMore: Boolean(list?.nextCursor),
    loadMore,
    loadingMore: Boolean(more?.loading),
    loadMoreError: more?.error ?? null,
  };
}
