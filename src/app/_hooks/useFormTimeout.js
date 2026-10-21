// useFormTimeout(onTimeout): times out an open Create / Edit Post form (docs/flows.md → Form
// timeout). Not a data hook. onTimeout is called once the form has been open for 20 hours. The
// wall clock is checked every minute and whenever the tab is shown again, rather than one long
// timer, so a laptop waking from sleep still times out on time.
//
// The session can expire first, and the browser can't read when (the cookie is httpOnly). So
// whenever the tab is shown again, GET /api/auth/me checks it: an expired session's 401 makes
// apiFetch load /sign-in?expired=1, which clears the form. Any other error is left for Publish.

"use client";

import { useEffect, useRef } from "react";
import { apiFetch } from "../_lib/apiFetch";

export const FORM_TIMEOUT_MS = 20 * 60 * 60 * 1000;
const CHECK_EVERY_MS = 60 * 1000;

export function useFormTimeout(onTimeout) {
  // The latest onTimeout, so the checks set up on mount always call the current one.
  const onTimeoutRef = useRef(onTimeout);
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  });

  useEffect(() => {
    const openedAt = Date.now();
    let timedOut = false;

    function checkTime() {
      if (timedOut || Date.now() - openedAt < FORM_TIMEOUT_MS) return;
      timedOut = true;
      onTimeoutRef.current();
    }

    function handleVisibilityChange() {
      if (document.visibilityState !== "visible") return;
      checkTime();
      if (!timedOut) apiFetch("/api/auth/me").catch(() => {});
    }

    const interval = setInterval(checkTime, CHECK_EVERY_MS);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
}
