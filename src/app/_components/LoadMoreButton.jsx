// LoadMoreButton: "Load more" under a paged list, while it has more pages, with the latest Load
// more's error under it. list: a paged hook's { error, hasMore, loadMore, loadingMore, loadMoreError }.

"use client";

import styles from "../_styling/dashPages.module.css";

export default function LoadMoreButton({ list }) {
  return (
    <>
      {list.hasMore && !list.error && (
        <button
          type="button"
          onClick={list.loadMore}
          disabled={list.loadingMore}
          className={styles.loadMore}
        >
          {list.loadingMore ? "Loading…" : "Load more"}
        </button>
      )}
      {list.loadMoreError && <p>{list.loadMoreError.message}</p>}
    </>
  );
}
