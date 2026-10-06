// useAccounts (admin): all site owner accounts with their websites.
// Returns { data, loading, error, refetch } plus createAccount. (linkWebsite arrives with
// Build Order step 6.)

"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../_lib/apiFetch";

export function useAccounts() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Bumping this key re-runs the fetch effect; current data stays visible meanwhile.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    // Ignore a response that arrives after this effect was cleaned up
    // (React Strict Mode runs effects twice in development).
    let ignore = false;

    apiFetch("/api/admin/accounts")
      .then((accounts) => {
        if (ignore) return;
        setData(accounts);
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

  // payload: { name, email, websiteId } or { name, email, websiteName, websiteUrl }.
  // Returns { account, website, credentials? } without keeping it: the one-time credentials
  // must never land in hook state. Throws the ApiError on failure.
  const createAccount = useCallback(
    async (payload) => {
      const result = await apiFetch("/api/admin/accounts", {
        method: "POST",
        body: payload,
      });
      refetch();
      return result;
    },
    [refetch],
  );

  return { data, loading, error, refetch, createAccount };
}
