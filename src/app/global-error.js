// Global error: shown by Next in place of the root layout when a render error reaches the top of
// the app. It reports the error to Sentry, then shows Next's default error page.

"use client";

import { useEffect } from "react";
import NextError from "next/error";
import { reportError } from "./_lib/sentry";

export default function GlobalError({ error }) {
  // A caught render error never reaches the browser's global error handlers, so it is reported
  // here.
  useEffect(() => {
    reportError(error);
  }, [error]);

  // It replaces the root layout, so it renders its own <html> and <body>.
  return (
    <html lang="en">
      <body>
        {/* statusCode 0: the App Router has no status code for a render error. */}
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
