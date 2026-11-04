// Proxy: on every page request, redirects a signed-in user away from / and /sign-in, and sets the
// page's Content Security Policy by page type.

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

  // Only checks that the cookie exists, never decodes it. A stale cookie is cleared by the backend
  // on the first 401, so this can't cause a redirect loop; an admin is sent on to /admin by the
  // dashboard layout.
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
  // Set on the request too, so Next stamps the nonce on its own scripts as it renders the page.
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
