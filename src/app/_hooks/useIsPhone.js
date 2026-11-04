// useIsPhone: true at the styling's one phone breakpoint, following the window as it resizes, for
// what a stylesheet can't change (the Google sign-in button's width). Returns a boolean.

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

// The server has no window, so it renders the desktop layout; the client's answer takes over once
// the page hydrates.
function isPhoneOnServer() {
  return false;
}

export function useIsPhone() {
  return useSyncExternalStore(subscribe, isPhoneNow, isPhoneOnServer);
}
