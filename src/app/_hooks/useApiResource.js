// useApiResource(path): internal, shared by the data hooks (useAccounts, useAllWebsites,
// useWebsites, usePost); components never call it directly. GETs path through apiFetch and
// returns { data, loading, error, refetch, setData }. Each data hook picks what it exposes.

"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../_lib/apiFetch";

export function useApiResource(path) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Bumping this key re-runs the fetch effect; current data stays visible meanwhile.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    // Ignore a response that arrives after this effect was cleaned up
    // (React Strict Mode runs effects twice in development).
    let ignore = false;

    apiFetch(path)
      .then((result) => {
        if (ignore) return;
        setData(result);
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
  }, [path, reloadKey]);

  const refetch = useCallback(() => setReloadKey((key) => key + 1), []);

  return { data, loading, error, refetch, setData };
}
