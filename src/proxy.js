// Proxy: matches only / and /sign-in. If a `session` cookie exists, redirects to /dashboard.
// Never decodes the cookie — it only checks that it exists. An admin is sent on from
// /dashboard to /admin by the dashboard layout. A stale cookie is cleared by the backend
// on the first 401, so this can't cause a redirect loop.

import { NextResponse } from "next/server";

export function proxy(request) {
  if (request.cookies.has("session")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/sign-in"],
};
