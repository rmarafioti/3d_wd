// useAllWebsites (admin): every active website; powers WebsitePicker.
// Returns { data, loading, error, refetch }.

"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../_lib/apiFetch";

export function useAllWebsites() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Bumping this key re-runs the fetch effect; current data stays visible meanwhile.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    // Ignore a response that arrives after this effect was cleaned up
    // (React Strict Mode runs effects twice in development).
    let ignore = false;

    apiFetch("/api/admin/websites")
      .then((websites) => {
        if (ignore) return;
        setData(websites);
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
  }, [reloadKey]);

  const refetch = useCallback(() => setReloadKey((key) => key + 1), []);

  return { data, loading, error, refetch };
}
