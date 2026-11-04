// Next.js config: the security headers every route gets, and the local-only rewrite of /api/* to
// the backend. The Content Security Policy differs by page type, so proxy.js sets it.

const SECURITY_HEADERS = [
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  // Two years. No `preload`: joining the browsers' preload list is hard to undo for the whole domain.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // The older form of the policies' frame-ancestors 'none', for browsers that don't read it.
  { key: "X-Frame-Options", value: "DENY" },
  // Keeps other origins' pages out of this window, while still letting the Google sign-in
  // pop-up this page opens report back to it (Google's recommended value).
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  // Local development only: /api/* goes to the local backend, so the two appear same-origin and the
  // session cookie lands on localhost:3000, where proxy.js can see it. API_PROXY_TARGET is never set
  // on Vercel, so no rewrite exists there.
  async rewrites() {
    if (!process.env.API_PROXY_TARGET) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_PROXY_TARGET}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
