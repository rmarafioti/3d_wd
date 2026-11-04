// Site owner layout (client): role-gates /dashboard (UX only, the backend enforces access), then
// provides the site owner's websites to every /dashboard route (SiteOwnerDataContext).

"use client";

import { useRoleGate } from "../_hooks/useRoleGate";
import { SiteOwnerDataProvider } from "../_context/SiteOwnerDataContext";

export default function DashboardLayout({ children }) {
  const { loading, error } = useRoleGate("site_owner");

  if (error) return <p>{error.message}</p>;
  if (loading) return <p>Loading…</p>;
  return <SiteOwnerDataProvider>{children}</SiteOwnerDataProvider>;
}
