// NavContext: what the Navbar's links need from a dashboard, set by its layout: whether the site
// owner can create a gallery (some website has Photo Galleries). The Navbar sits in the root
// layout, above the dashboards' own data, so it reads this instead. Starts empty and never fetches
// on its own, like AuthContext.

"use client";

import { createContext, useState } from "react";

export const NavContext = createContext({
  canCreateGallery: false,
  setCanCreateGallery: () => {},
});

export function NavProvider({ children }) {
  const [canCreateGallery, setCanCreateGallery] = useState(false);

  return (
    <NavContext.Provider value={{ canCreateGallery, setCanCreateGallery }}>
      {children}
    </NavContext.Provider>
  );
}
