// useMailbox(role): the role's updates and threads in one list, newest first, each tagged { type:
// "update" | "message", date }. Returns { data, loading, error, refetch } and the paging fields.

"use client";

import { useCallback } from "react";
import { usePagedList } from "./usePagedList";
import { THREADS_PATH_BY_ROLE, UPDATES_PATH_BY_ROLE } from "./useInboxActions";

// The date an item sorts by: an update's sending, a thread's latest message.
function tag(items, type, dateField) {
  return (items ?? []).map((item) => ({
    ...item,
    type,
    date: item[dateField],
  }));
}

// The oldest loaded date of a list that has more pages, or null when it has none: an item older
// than it can't be shown yet, since the list's next page may hold a newer one.
function oldestIfMore(list, items) {
  return list.hasMore ? items[items.length - 1].date : null;
}

// An update and a thread may share an id, so an item is keyed by both, for its row and its checkbox.
export function mailboxItemKey(item) {
  return `${item.type}-${item.id}`;
}

export function useMailbox(role) {
  const updates = usePagedList(UPDATES_PATH_BY_ROLE[role]);
  const threads = usePagedList(THREADS_PATH_BY_ROLE[role]);
  const lists = [updates, threads];

  const updateItems = tag(updates.data, "update", "createdAt");
  const threadItems = tag(threads.data, "message", "lastMessageAt");
  // ISO dates in UTC sort as strings. The boundary is the newest of the lists' oldest dates.
  const cutoffs = [
    oldestIfMore(updates, updateItems),
    oldestIfMore(threads, threadItems),
  ];
  const boundary = cutoffs.filter(Boolean).sort().at(-1) ?? null;
  const data =
    updates.data && threads.data
      ? [...updateItems, ...threadItems]
          .filter((item) => !boundary || item.date >= boundary)
          .sort((a, b) => b.date.localeCompare(a.date))
      : null;

  const { loadMore: loadMoreUpdates, refetch: refetchUpdates } = updates;
  const { loadMore: loadMoreThreads, refetch: refetchThreads } = threads;
  const [updatesCutoff, threadsCutoff] = cutoffs;

  // Pages on only the list (or both) holding the boundary, the one keeping older items hidden.
  const loadMore = useCallback(() => {
    if (updatesCutoff && updatesCutoff === boundary) loadMoreUpdates();
    if (threadsCutoff && threadsCutoff === boundary) loadMoreThreads();
  }, [
    boundary,
    updatesCutoff,
    threadsCutoff,
    loadMoreUpdates,
    loadMoreThreads,
  ]);

  // Both lists from the start, after an update is edited or withdrawn.
  const refetch = useCallback(() => {
    refetchUpdates();
    refetchThreads();
  }, [refetchUpdates, refetchThreads]);

  const error = updates.error ?? threads.error;
  return {
    data,
    loading: !data && !error,
    error,
    refetch,
    hasMore: lists.some((list) => list.hasMore),
    loadMore,
    loadingMore: lists.some((list) => list.loadingMore),
    loadMoreError: updates.loadMoreError ?? threads.loadMoreError,
  };
}
