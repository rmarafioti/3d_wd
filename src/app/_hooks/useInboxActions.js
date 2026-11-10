// useInboxActions(role): the inbox's mutations: startThread, reply and markThreadRead; the admin's
// sendUpdate, editUpdate and withdrawUpdate; the site owner's markUpdateRead. It fetches nothing.

"use client";

import { useCallback } from "react";
import { apiFetch } from "../_lib/apiFetch";

// The admin's updates are the ones it sent; a site owner's, the ones it received.
export const UPDATES_PATH_BY_ROLE = {
  admin: "/api/admin/notifications",
  site_owner: "/api/siteOwner/notifications",
};

export const THREADS_PATH_BY_ROLE = {
  admin: "/api/admin/threads",
  site_owner: "/api/siteOwner/threads",
};

export function useInboxActions(role) {
  const threadsPath = THREADS_PATH_BY_ROLE[role];

  // payload: { subject, message }, plus the admin's { accountId }. Returns the new thread; throws
  // the ApiError on failure.
  const startThread = useCallback(
    (payload) => apiFetch(threadsPath, { method: "POST", body: payload }),
    [threadsPath],
  );

  // Returns the whole thread with the new message last.
  const reply = useCallback(
    (threadId, message) =>
      apiFetch(`${threadsPath}/${encodeURIComponent(threadId)}/messages`, {
        method: "POST",
        body: { message },
      }),
    [threadsPath],
  );

  // Safe to send again. Returns the thread's summary.
  const markThreadRead = useCallback(
    (threadId) =>
      apiFetch(`${threadsPath}/${encodeURIComponent(threadId)}/read`, {
        method: "POST",
      }),
    [threadsPath],
  );

  // Site owner only: the admin receives no updates. Safe to send again.
  const markUpdateRead = useCallback(
    (id) =>
      apiFetch(
        `${UPDATES_PATH_BY_ROLE.site_owner}/${encodeURIComponent(id)}/read`,
        {
          method: "POST",
        },
      ),
    [],
  );

  // Admin only. update: { title, body }. Returns the AdminNotification.
  const sendUpdate = useCallback(
    (update) =>
      apiFetch(UPDATES_PATH_BY_ROLE.admin, { method: "POST", body: update }),
    [],
  );

  // Admin only. update: { title, body }, the only fields an update can change.
  const editUpdate = useCallback(
    (id, update) =>
      apiFetch(`${UPDATES_PATH_BY_ROLE.admin}/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: update,
      }),
    [],
  );

  // Admin only. Removes it from every mailbox; resolves once the API answers 204.
  const withdrawUpdate = useCallback(
    (id) =>
      apiFetch(`${UPDATES_PATH_BY_ROLE.admin}/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    [],
  );

  return {
    startThread,
    reply,
    markThreadRead,
    markUpdateRead,
    sendUpdate,
    editUpdate,
    withdrawUpdate,
  };
}
