// Client instrumentation: Next.js runs this before the app's own client code on every page, so
// Sentry's handlers catch any uncaught error or unhandled rejection from the first script on.
// Sentry is off unless NEXT_PUBLIC_SENTRY_DSN is set (production only, _lib/sentry.js).

import { initSentry } from "./app/_lib/sentry";

initSentry();
