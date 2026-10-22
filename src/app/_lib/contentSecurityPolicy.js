// contentSecurityPolicy: the two Content Security Policies proxy.js sets, split by page type.
// Session pages render per request and get a nonce policy: only scripts carrying that request's
// nonce, or added by one of them ('strict-dynamic'), run. Static pages are prerendered, so their
// inline scripts can't carry a nonce; they get a fixed policy, which is safe only because a static
// page shows no user content and holds no session. Any page not in STATIC_PATHS gets the nonce
// policy, so a forgotten page fails loudly (its scripts blocked) rather than quietly weak.

// The static pages. A page joins this list only if it renders no user content and needs no session.
export const STATIC_PATHS = ["/"];

const GOOGLE_SIGN_IN = "https://accounts.google.com/gsi/";

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
  ].filter(Boolean);

  return toHeader([
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${devEval()}`,
    // No nonce here: a nonce would make browsers ignore 'unsafe-inline', which the style="…"
    // attributes of React, next/image and the Google button need.
    `style-src 'self' 'unsafe-inline' ${GOOGLE_SIGN_IN}style`,
    // blob: for a picked image shown from memory before Publish uploads it.
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
  return toHeader([
    "default-src 'self'",
    // Next's prerendered HTML carries inline scripts, which can't have a nonce.
    `script-src 'self' 'unsafe-inline'${devEval()}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ]);
}
