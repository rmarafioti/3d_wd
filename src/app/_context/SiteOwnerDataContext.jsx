// SiteOwnerDataContext: the site owner's websites (useWebsites), fetched once by the dashboard
// layout and shared by everything under /dashboard.

"use client";

import { createContext, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useWebsites } from "../_hooks/useWebsites";
import { useNav } from "../_hooks/useNav";
import { findAbility } from "../_lib/abilities";

export const SiteOwnerDataContext = createContext(null);

export function SiteOwnerDataProvider({ children }) {
  const websites = useWebsites();
  const { refetch } = websites;
  const { setCanCreateGallery } = useNav();
  const pathname = usePathname();
  // The first page fetches through useWebsites itself; only a later arrival on /dashboard refetches.
  const arrived = useRef(false);
  const canCreateGallery = Boolean(
    websites.data?.some((website) => findAbility(website, "galleries")),
  );

  // The layout stays mounted across /dashboard pages, so returning to /dashboard fetches again: a
  // post or gallery changed or deleted on its own page shows as it is, the list keeping its rows.
  useEffect(() => {
    if (!arrived.current) {
      arrived.current = true;
      return;
    }
    if (pathname === "/dashboard") refetch();
  }, [pathname, refetch]);

  // The Navbar sits above the dashboards, so it learns through NavContext whether to show its
  // "Create a Gallery" link.
  useEffect(() => {
    setCanCreateGallery(canCreateGallery);
  }, [canCreateGallery, setCanCreateGallery]);
  // Leaving the dashboard (signing out) takes the link away with it.
  useEffect(() => () => setCanCreateGallery(false), [setCanCreateGallery]);

  return (
    <SiteOwnerDataContext.Provider value={websites}>
      {children}
    </SiteOwnerDataContext.Provider>
  );
}
