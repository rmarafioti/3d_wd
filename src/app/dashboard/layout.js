// Site owner layout (client): calls GET /api/auth/me, stores the user in AuthContext,
// redirects admins to /admin. UX only — the backend enforces access.

"use client";

import { useRoleGate } from "../_hooks/useRoleGate";

export default function DashboardLayout({ children }) {
  const { loading, error } = useRoleGate("site_owner");

  if (error) return <p>{error.message}</p>;
  if (loading) return <p>Loading…</p>;
  return children;
}
