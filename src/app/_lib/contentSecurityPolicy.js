// contentSecurityPolicy: the two Content Security Policies proxy.js sets, a nonce policy for
// session pages and a fixed one for static pages.

// The static pages. A page joins this list only if it renders no user content and needs no session.
// Any other page gets the nonce policy, so a forgotten page fails loudly (its scripts blocked)
// rather than quietly weak.
export const STATIC_PATHS = ["/"];

const GOOGLE_SIGN_IN = "https://accounts.google.com/gsi/";

// The Sentry DSN's origin (https://o123.ingest.us.sentry.io), or null while Sentry is off
// (NEXT_PUBLIC_SENTRY_DSN is set on production only) or the DSN can't be read.
export function sentryOrigin() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return null;
  try {
    return new URL(dsn).origin;
  } catch {
    return null;
  }
}

// React uses eval for its development error overlays; it never does in production.
function devEval() {
  return process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";
}

function toHeader(directives) {
  return directives.join("; ");
}

export function sessionPolicy(nonce) {
  // The API origin is empty locally, where /api goes through the same-origin dev rewrite.
  const connectSources = [
    "'self'",
    process.env.NEXT_PUBLIC_API_BASE_URL,
    "https://api.cloudinary.com",
    GOOGLE_SIGN_IN,
    sentryOrigin(),
  ].filter(Boolean);

  return toHeader([
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${devEval()}`,
    // No nonce here: a nonce would make browsers ignore 'unsafe-inline', which the style="…"
    // attributes of React, next/image and the Google button need.
    `style-src 'self' 'unsafe-inline' ${GOOGLE_SIGN_IN}style`,
    // blob: for a picked image shown from memory before Submit uploads it.
    "img-src 'self' data: blob: https://res.cloudinary.com",
    "font-src 'self'",
    `connect-src ${connectSources.join(" ")}`,
    `frame-src ${GOOGLE_SIGN_IN}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ]);
}

export function staticPolicy() {
  const connectSources = ["'self'", sentryOrigin()].filter(Boolean);

  return toHeader([
    "default-src 'self'",
    // Next's prerendered HTML carries inline scripts, which can't have a nonce. 'unsafe-inline' is
    // safe only because a static page shows no user content and holds no session.
    `script-src 'self' 'unsafe-inline'${devEval()}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src ${connectSources.join(" ")}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ]);
}
