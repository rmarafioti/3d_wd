// Client instrumentation: Next.js runs this before the app's own client code on every page, so
// Sentry catches any uncaught error from the first script on (production only, _lib/sentry.js).

import { initSentry } from "./app/_lib/sentry";

initSentry();
