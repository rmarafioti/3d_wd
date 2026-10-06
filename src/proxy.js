// Proxy: matches only / and /sign-in. If a `session` cookie exists, redirects to /dashboard.
// Never decodes the cookie — it only checks that it exists.

import { NextResponse } from "next/server";

// Placeholder: passes every request through until the session-cookie redirect is built (step 2).
export function proxy() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/sign-in"],
};
