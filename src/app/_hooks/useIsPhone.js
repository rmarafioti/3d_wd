// useIsPhone: true at phone width, the one breakpoint the styling uses everywhere
// (max-width: 667px), and it follows the window as it is resized. For layouts that behave
// differently on a phone, not only look different (the post preview is a separate view there).
// Not a data hook, so it returns a boolean rather than { data, loading, error }.

"use client";

import { useSyncExternalStore } from "react";

const PHONE_QUERY = "(max-width: 667px)";

function subscribe(onChange) {
  const query = window.matchMedia(PHONE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function isPhoneNow() {
  return window.matchMedia(PHONE_QUERY).matches;
}

// The dashboards only render on the client, so the server answer is never shown; false keeps
// the server render on the desktop layout.
function isPhoneOnServer() {
  return false;
}

export function useIsPhone() {
  return useSyncExternalStore(subscribe, isPhoneNow, isPhoneOnServer);
}
