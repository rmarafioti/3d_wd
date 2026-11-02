// Sentry error reporting (issue #61): the one place the app talks to Sentry, mirroring the
// backend's lib/sentry.js. Production only: with NEXT_PUBLIC_SENTRY_DSN empty (locally, in tests
// and on staging) Sentry stays off and nothing is sent.
//
// An event carries the error and the page it happened on, never what a user typed or sent: no
// cookies, headers, bodies, query strings or user, by two layers. dataCollection tells the SDK not
// to collect them, and scrubEvent removes them again before anything leaves. No breadcrumbs (they
// would hold console output and clicked or typed elements), no tracing and no Session Replay, so
// the free plan's quota goes to errors. An ApiError is never reported: apiFetch's failures are
// shown to the user, and the backend reports its own 500s.

import * as Sentry from "@sentry/browser";
import { ApiError } from "./apiFetch";

// Default integrations left out: breadcrumbs, and the session pings sent on every page load.
const LEFT_OUT_INTEGRATIONS = ["Breadcrumbs", "BrowserSession"];

// The last layer before an event leaves: drops an ApiError, keeps the page's path without its
// query string, and drops anything a user sent or the SDK gathered around the error.
function scrubEvent(event, hint) {
  if (hint?.originalException instanceof ApiError) return null;
  if (event.request) {
    event.request = { url: event.request.url?.split("?")[0] };
  }
  delete event.user;
  delete event.breadcrumbs;
  delete event.extra;
  if (event.contexts) {
    delete event.contexts.request;
    delete event.contexts.response;
  }
  return event;
}

// `overrides` is for tests only (a transport that records events instead of sending them).
export function initSentry(overrides = {}) {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: "production",
    // Set by Vercel on its builds; undefined elsewhere.
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    sendDefaultPii: false,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      queryParams: false,
      urlQueryParams: false,
    },
    integrations: (defaults) =>
      defaults.filter(
        (integration) => !LEFT_OUT_INTEGRATIONS.includes(integration.name),
      ),
    beforeBreadcrumb: () => null,
    beforeSend: scrubEvent,
    ...overrides,
  });
}

// Reports an error a boundary caught (global-error.js). Does nothing while Sentry is off.
export function reportError(error) {
  if (Sentry.isInitialized()) Sentry.captureException(error);
}
