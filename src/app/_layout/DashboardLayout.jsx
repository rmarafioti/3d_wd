// Site owner layout (client): calls GET /api/auth/me, stores the user in AuthContext,
// redirects admins to /admin. UX only — the backend enforces access.
// Once the role is confirmed, it provides the site owner's websites (SiteOwnerDataContext) to every
// /dashboard route, which also tells the Navbar whether Create a Gallery shows.

"use client";

import { useRoleGate } from "../_hooks/useRoleGate";
import { SiteOwnerDataProvider } from "../_context/SiteOwnerDataContext";

export default function DashboardLayout({ children }) {
  const { loading, error } = useRoleGate("site_owner");

  if (error) return <p>{error.message}</p>;
  if (loading) return <p>Loading…</p>;
  return <SiteOwnerDataProvider>{children}</SiteOwnerDataProvider>;
}
