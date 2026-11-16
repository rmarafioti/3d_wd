// Keeps the landing page's URL at "/" so a refresh always starts at the top: a section hash the
// visitor arrived with is cleared once the browser has scrolled to it, and the browser doesn't
// restore the last scroll position.

"use client";

import { useEffect } from "react";

export default function LandingUrl() {
  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    }
    // Back on another page keeps the browser's own restoring.
    const { history } = window;
    history.scrollRestoration = "manual";
    return () => {
      history.scrollRestoration = "auto";
    };
  }, []);

  return null;
}
