// Proxy: runs on every page request and does two jobs.
// 1. Redirect: on / and /sign-in only, a `session` cookie sends the user to /dashboard. It never
//    decodes the cookie, only checks that it exists. An admin is sent on from /dashboard to /admin
//    by the dashboard layout. A stale cookie is cleared by the backend on the first 401, so this
//    can't cause a redirect loop.
// 2. Content Security Policy, by page type (_lib/contentSecurityPolicy.js): a static page gets the
//    fixed policy; every other page gets a fresh nonce, set on the request too, so Next stamps it
//    on its own scripts as it renders the page (those pages render per request for this).

import { NextResponse } from "next/server";
import {
  STATIC_PATHS,
  sessionPolicy,
  staticPolicy,
} from "./app/_lib/contentSecurityPolicy";

const REDIRECT_PATHS = ["/", "/sign-in"];
const CSP = "Content-Security-Policy";

export function proxy(request) {
  const { pathname } = request.nextUrl;

  if (REDIRECT_PATHS.includes(pathname) && request.cookies.has("session")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (STATIC_PATHS.includes(pathname)) {
    const response = NextResponse.next();
    response.headers.set(CSP, staticPolicy());
    return response;
  }

  const policy = sessionPolicy(
    Buffer.from(crypto.randomUUID()).toString("base64"),
  );
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(CSP, policy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(CSP, policy);
  return response;
}

export const config = {
  matcher: [
    // Every page, but not the API, Next's static files and images, the favicon, or prefetches
    // (a prefetch fetches no document, so it needs no policy).
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
