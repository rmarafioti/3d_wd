// Next.js config. In local development, /api/* is rewritten to the local backend
// (API_PROXY_TARGET) so the frontend and backend appear same-origin and the session
// cookie lands on localhost:3000, where proxy.js can see it. API_PROXY_TARGET is not
// set in production, so no rewrite exists there.

/** @type {import('next').NextConfig} */
const nextConfig = {
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
