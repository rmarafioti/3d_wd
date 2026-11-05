// useAuditEvents(query) (admin): GET /api/admin/auditEvents for one UTC month or one local day, a
// page at a time. Returns { data, loading, error } plus hasMore, loadMore, loadingMore, loadMoreError.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "../_lib/apiFetch";

function pathFor(query, cursor) {
  const path = `/api/admin/auditEvents?${query}`;
  return cursor ? `${path}&cursor=${encodeURIComponent(cursor)}` : path;
}

// The query for a UTC month ("YYYY-MM"), or, given a date from a date field ("YYYY-MM-DD"), for
// that day in the admin's own time zone: local midnight to the next local midnight, sent as
// instants (from inclusive, to exclusive), so a DST day is 23 or 25 hours. Null fetches nothing.
export function auditEventsQuery({ month, date }) {
  if (date) {
    const [year, monthNumber, day] = date.split("-").map(Number);
    const from = new Date(year, monthNumber - 1, day).toISOString();
    const to = new Date(year, monthNumber - 1, day + 1).toISOString();
    return `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  }
  return month ? `month=${month}` : null;
}

// Its own fetch rather than useApiResource, which holds a single response and can't append pages.
export function useAuditEvents(query) {
  // Each result remembers the query it belongs to, so switching month or day shows "Loading…" at
  // once and a result for another query is never shown as this one's.
  const [page, setPage] = useState(null); // { query, data, nextCursor }
  const [failure, setFailure] = useState(null); // { query, error }
  const [more, setMore] = useState(null); // { query, loading, error }, the latest Load more
  // The query on screen, for a Load more response that arrives after the admin moved on.
  const shownQuery = useRef(query);

  useEffect(() => {
    shownQuery.current = query;
    // A null query fetches nothing and stays loading, for a caller still finding out which month
    // to show.
    if (!query) return;
    // Ignore a response that arrives after this effect was cleaned up (the query changed, or
    // React Strict Mode ran the effect twice in development).
    let ignore = false;

    apiFetch(pathFor(query), { paginated: true })
      .then((result) => {
        if (ignore) return;
        setPage({ query, ...result });
        setFailure(null);
      })
      .catch((err) => {
        // On a 401, apiFetch is already redirecting to /sign-in; keep showing loading.
        if (ignore || err.status === 401) return;
        setFailure({ query, error: err });
      });

    return () => {
      ignore = true;
    };
  }, [query]);

  const current = page?.query === query ? page : null;
  const error = failure?.query === query ? failure.error : null;
  const currentMore = more?.query === query ? more : null;

  const loadMore = useCallback(async () => {
    const cursor = current?.nextCursor;
    if (!cursor) return;
    setMore({ query, loading: true, error: null });
    try {
      const next = await apiFetch(pathFor(query, cursor), { paginated: true });
      // Append only onto the page this cursor came from; the query may have been left and
      // reloaded meanwhile.
      setPage((latest) =>
        latest?.query === query && latest.nextCursor === cursor
          ? {
              query,
              data: [...latest.data, ...next.data],
              nextCursor: next.nextCursor,
            }
          : latest,
      );
      setMore(null);
    } catch (err) {
      if (shownQuery.current !== query || err.status === 401) return;
      setMore({ query, loading: false, error: err });
    }
  }, [current, query]);

  return {
    data: current?.data ?? null,
    loading: !current && !error,
    error,
    hasMore: Boolean(current?.nextCursor),
    loadMore,
    loadingMore: Boolean(currentMore?.loading),
    loadMoreError: currentMore?.error ?? null,
  };
}
