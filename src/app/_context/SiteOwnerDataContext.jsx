// SiteOwnerDataContext: the site owner's websites (useWebsites), fetched by the dashboard layout and
// shared by everything under /dashboard, like AdminDataContext for /admin. The layout stays
// mounted across /dashboard pages, so returning to /dashboard fetches them again: a post or
// gallery changed or deleted on its own page (and an ability that moved with it) shows as it is
// now, the list keeping its rows meanwhile. The layout
// also tells the Navbar, through NavContext, whether a gallery can be created, so its "Create a
// Gallery" link shows once some website has Photo Galleries.

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

  useEffect(() => {
    if (!arrived.current) {
      arrived.current = true;
      return;
    }
    if (pathname === "/dashboard") refetch();
  }, [pathname, refetch]);

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
