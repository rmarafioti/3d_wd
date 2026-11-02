// useAbilities (site owner): a website's abilities (docs/api.md → Notes, Abilities): add one, send
// its request form, turn it on or off, and remove it. It fetches nothing, like useGalleries: the
// abilities come with each website from useWebsites, which the dashboard refetches after each.
// Each returns the API's data and throws the ApiError on failure.

"use client";

import { useCallback } from "react";
import { apiFetch } from "../_lib/apiFetch";

function abilityPath(id) {
  return `/api/siteOwner/abilities/${encodeURIComponent(id)}`;
}

export function useAbilities() {
  // kind: "posts" or "galleries". Also how a removed ability is added back. Returns the Ability.
  const add = useCallback(
    (websiteId, kind) =>
      apiFetch("/api/siteOwner/abilities", {
        method: "POST",
        body: { websiteId, kind },
      }),
    [],
  );

  // The request form: where on their website its content should appear. Returns the Ability.
  const request = useCallback(
    (id, requestNote) =>
      apiFetch(`${abilityPath(id)}/request`, {
        method: "POST",
        body: { requestNote },
      }),
    [],
  );

  // Only once the ability is live. Returns the Ability.
  const setTurnedOn = useCallback(
    (id, turnedOn) =>
      apiFetch(`${abilityPath(id)}/turnedOn`, {
        method: "PATCH",
        body: { turnedOn },
      }),
    [],
  );

  // Photo Galleries only: its galleries are deleted with it. Resolves once the API answers 204.
  // Named remove because delete is a reserved word.
  const remove = useCallback(
    (id) => apiFetch(abilityPath(id), { method: "DELETE" }),
    [],
  );

  return { add, request, setTurnedOn, remove };
}
