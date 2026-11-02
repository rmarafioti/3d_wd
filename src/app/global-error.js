// Global error: Next renders this in place of the root layout when a render error reaches the top
// of the app. It reports the error to Sentry (production only, _lib/sentry.js), since a caught
// render error never reaches the browser's global error handlers, then shows Next's own default
// error page, the same one shown without this file. It replaces the root layout, so it renders
// its own <html> and <body>.

"use client";

import { useEffect } from "react";
import NextError from "next/error";
import { reportError } from "./_lib/sentry";

export default function GlobalError({ error }) {
  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        {/* statusCode 0: the App Router has no status code for a render error. */}
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
