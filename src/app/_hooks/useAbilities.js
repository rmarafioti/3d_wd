// useAbilities (site owner): add, request, edit the request, turn on or off and remove a website's
// abilities. It fetches nothing: the abilities come with each website from useWebsites.

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

  // A change of mind: edits the request form already sent, which puts the ability back to
  // requested. Returns the Ability.
  const editRequest = useCallback(
    (id, requestNote) =>
      apiFetch(`${abilityPath(id)}/request`, {
        method: "PATCH",
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

  return { add, request, editRequest, setTurnedOn, remove };
}
