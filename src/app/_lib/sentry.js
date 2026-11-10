// sentry: the one place the app talks to Sentry, production only (off while its DSN is empty). An
// event carries the error and the page's path, never what a user typed or sent.

import * as Sentry from "@sentry/browser";
import { ApiError } from "./apiFetch";

// Default integrations left out: breadcrumbs, which would hold console output and clicked or typed
// elements, and the session pings sent on every page load.
const LEFT_OUT_INTEGRATIONS = ["Breadcrumbs", "BrowserSession"];

// The last layer before an event leaves: drops an ApiError, keeps the page's path without its
// query string, and drops anything a user sent or the SDK gathered around the error. An ApiError
// is never reported: the user already sees it, and the backend reports its own 500s.
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
    // The first of two layers: the SDK collects none of these, and scrubEvent removes them again.
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

// Reports a Submit whose image uploads failed after their retries: how many of how many, and why
// (e.g. "network", "status 503"). Never the file, its name or the upload URL and fields. The one
// fixed message groups every upload failure as one Sentry issue.
export function reportUploadFailure({ failed, total, reasons }) {
  if (!Sentry.isInitialized()) return;
  Sentry.captureException(new Error("Image upload failed"), {
    tags: {
      uploadFailed: failed,
      uploadTotal: total,
      uploadFailure: reasons.join(", "),
    },
  });
}
