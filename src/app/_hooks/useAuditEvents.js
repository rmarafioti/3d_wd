// useAuditEvents(month) (admin): one UTC month ("YYYY-MM") of audit events, newest first, a page
// at a time (GET /api/admin/auditEvents). A null month fetches nothing and stays loading, for a
// caller still finding out which month to show. Returns { data, loading, error } plus hasMore, loadMore,
// loadingMore and loadMoreError. Its own fetch rather than useApiResource, which holds a single
// response and can't append pages.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "../_lib/apiFetch";

function pathFor(month, cursor) {
  const path = `/api/admin/auditEvents?month=${month}`;
  return cursor ? `${path}&cursor=${encodeURIComponent(cursor)}` : path;
}

export function useAuditEvents(month) {
  // Each result remembers the month it belongs to, so switching months shows "Loading…" at once
  // and a result for another month is never shown as this one's.
  const [page, setPage] = useState(null); // { month, data, nextCursor }
  const [failure, setFailure] = useState(null); // { month, error }
  const [more, setMore] = useState(null); // { month, loading, error }, the latest Load more
  // The month on screen, for a Load more response that arrives after the admin switched months.
  const shownMonth = useRef(month);

  useEffect(() => {
    shownMonth.current = month;
    if (!month) return;
    // Ignore a response that arrives after this effect was cleaned up (the month changed, or
    // React Strict Mode ran the effect twice in development).
    let ignore = false;

    apiFetch(pathFor(month), { paginated: true })
      .then((result) => {
        if (ignore) return;
        setPage({ month, ...result });
        setFailure(null);
      })
      .catch((err) => {
        // On a 401, apiFetch is already redirecting to /sign-in; keep showing loading.
        if (ignore || err.status === 401) return;
        setFailure({ month, error: err });
      });

    return () => {
      ignore = true;
    };
  }, [month]);

  const current = page?.month === month ? page : null;
  const error = failure?.month === month ? failure.error : null;
  const currentMore = more?.month === month ? more : null;

  const loadMore = useCallback(async () => {
    const cursor = current?.nextCursor;
    if (!cursor) return;
    setMore({ month, loading: true, error: null });
    try {
      const next = await apiFetch(pathFor(month, cursor), { paginated: true });
      // Append only onto the page this cursor came from; the month may have been left and
      // reloaded meanwhile.
      setPage((latest) =>
        latest?.month === month && latest.nextCursor === cursor
          ? {
              month,
              data: [...latest.data, ...next.data],
              nextCursor: next.nextCursor,
            }
          : latest,
      );
      setMore(null);
    } catch (err) {
      if (shownMonth.current !== month || err.status === 401) return;
      setMore({ month, loading: false, error: err });
    }
  }, [current, month]);

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
