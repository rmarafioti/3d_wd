// useAccounts (admin): all site owner accounts with their websites (each with its abilities and
// gallery summaries). Returns { data, loading, error, refetch } plus createAccount, linkWebsite,
// setAbilityLive and setGalleryLive.

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

  // Sets an ability live (docs/api.md → Notes, Abilities): Photo Galleries once its component is
  // wired into the client website; posts, with their placement, once they show there and the
  // client has approved them. Returns the Ability. Throws the ApiError on failure.
  const setAbilityLive = useCallback(
    async (abilityId) => {
      const result = await apiFetch(
        `/api/admin/abilities/${encodeURIComponent(abilityId)}/status`,
        { method: "PATCH", body: { status: "live" } },
      );
      refetch();
      return result;
    },
    [refetch],
  );

  // Sets a requested gallery's placement live, once it shows on the client website and the
  // client has approved it; Photo Galleries must be live first. Returns the AdminGallerySummary.
  // Throws the ApiError on failure.
  const setGalleryLive = useCallback(
    async (galleryId) => {
      const result = await apiFetch(
        `/api/admin/galleries/${encodeURIComponent(galleryId)}/placement`,
        { method: "PATCH", body: { placement: "live" } },
      );
      refetch();
      return result;
    },
    [refetch],
  );

  return {
    data,
    loading,
    error,
    refetch,
    createAccount,
    linkWebsite,
    setAbilityLive,
    setGalleryLive,
  };
}
