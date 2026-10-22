// Next.js config. In local development, /api/* is rewritten to the local backend
// (API_PROXY_TARGET) so the frontend and backend appear same-origin and the session
// cookie lands on localhost:3000, where proxy.js can see it. API_PROXY_TARGET is not
// set in production, so no rewrite exists there.
// Every route also gets the security headers below. The Content Security Policy, which differs
// by page type, is set by proxy.js.

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
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
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
