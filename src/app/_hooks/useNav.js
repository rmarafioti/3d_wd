// useNav: reads NavContext, returns { canCreateGallery, setCanCreateGallery, unreadVersion,
// refreshUnread }.

"use client";

import { useContext } from "react";
import { NavContext } from "../_context/NavContext";

export function useNav() {
  return useContext(NavContext);
}
