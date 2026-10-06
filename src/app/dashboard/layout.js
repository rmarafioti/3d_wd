// Site owner layout (client): calls GET /api/auth/me, stores the user in AuthContext,
// redirects admins to /admin. UX only — the backend enforces access.

export default function DashboardLayout({ children }) {
  return children;
}
