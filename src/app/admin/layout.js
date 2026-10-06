// Admin layout (client): calls GET /api/auth/me, stores the user in AuthContext,
// redirects site owners to /dashboard. UX only — the backend enforces access.

"use client";

import { useRoleGate } from "../_hooks/useRoleGate";

export default function AdminLayout({ children }) {
  const { loading, error } = useRoleGate("admin");

  if (error) return <p>{error.message}</p>;
  if (loading) return <p>Loading…</p>;
  return children;
}
