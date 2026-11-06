// NavContext: what the Navbar needs from a dashboard, set by its layout and pages, since the Navbar
// sits in the root layout above the dashboards' own data. Starts empty and never fetches.

"use client";

import { createContext, useCallback, useState } from "react";

export const NavContext = createContext({
  canCreateGallery: false,
  setCanCreateGallery: () => {},
  unreadVersion: 0,
  refreshUnread: () => {},
});

export function NavProvider({ children }) {
  // Whether the site owner can create a gallery: some website has Photo Galleries.
  const [canCreateGallery, setCanCreateGallery] = useState(false);
  // Bumped by a page once it marks an update or a thread read, so the mail badge fetches its count
  // again without a route change.
  const [unreadVersion, setUnreadVersion] = useState(0);
  const refreshUnread = useCallback(
    () => setUnreadVersion((version) => version + 1),
    [],
  );

  return (
    <NavContext.Provider
      value={{
        canCreateGallery,
        setCanCreateGallery,
        unreadVersion,
        refreshUnread,
      }}
    >
      {children}
    </NavContext.Provider>
  );
}
