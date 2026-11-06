// Site owner layout (client): role-gates /dashboard (UX only, the backend enforces access), then
// provides the site owner's websites to every /dashboard route and renders the Abilities aside.

"use client";

import { useRoleGate } from "../_hooks/useRoleGate";
import { useSiteOwnerData } from "../_hooks/useSiteOwnerData";
import { SiteOwnerDataProvider } from "../_context/SiteOwnerDataContext";
import AbilitiesAside from "../_components/AbilitiesAside";

import styles from "../_styling/dashPages.module.css";

// Inside the provider, so it reads the same websites as the page: a change in either refetches
// them for both.
function WebsitesAside() {
  const websites = useSiteOwnerData();
  if (!websites.data) return null;
  return (
    <AbilitiesAside websites={websites.data} onChange={websites.refetch} />
  );
}

export default function DashboardLayout({ children }) {
  const { loading, error } = useRoleGate("site_owner");

  if (error) return <p>{error.message}</p>;
  if (loading) return <p>Loading…</p>;
  return (
    <SiteOwnerDataProvider>
      <div className={styles.dashboardLayout}>
        {children}
        <WebsitesAside />
      </div>
    </SiteOwnerDataProvider>
  );
}
