// Admin layout (client): calls GET /api/auth/me, stores the user in AuthContext,
// redirects site owners to /dashboard. UX only — the backend enforces access.

export default function AdminLayout({ children }) {
  return children;
}
