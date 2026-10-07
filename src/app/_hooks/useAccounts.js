// useAccounts (admin): all site owner accounts with their websites.
// Returns { data, loading, error, refetch } plus createAccount and linkWebsite.

"use client";

import { useCallback } from "react";
import { apiFetch } from "../_lib/apiFetch";
import { useApiResource } from "./useApiResource";

export function useAccounts() {
  const { data, loading, error, refetch } = useApiResource(
    "/api/admin/accounts",
  );

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

  // accountId is the account's own id (not one of its websites). payload: { websiteId } or
  // { websiteName, websiteUrl }. Returns { website, credentials? } without keeping it, for the
  // same one-time reason as createAccount. Throws the ApiError on failure.
  const linkWebsite = useCallback(
    async (accountId, payload) => {
      const result = await apiFetch(
        `/api/admin/accounts/${accountId}/websites`,
        { method: "POST", body: payload },
      );
      refetch();
      return result;
    },
    [refetch],
  );

  return { data, loading, error, refetch, createAccount, linkWebsite };
}
