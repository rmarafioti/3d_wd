// NavContext: what the Navbar's links need from a dashboard, set by its layout, since the Navbar
// sits in the root layout above the dashboards' own data. Starts empty and never fetches.

"use client";

import { createContext, useState } from "react";

export const NavContext = createContext({
  canCreateGallery: false,
  setCanCreateGallery: () => {},
});

export function NavProvider({ children }) {
  // Whether the site owner can create a gallery: some website has Photo Galleries.
  const [canCreateGallery, setCanCreateGallery] = useState(false);

  return (
    <NavContext.Provider value={{ canCreateGallery, setCanCreateGallery }}>
      {children}
    </NavContext.Provider>
  );
}
