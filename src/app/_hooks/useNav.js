// useNav: reads NavContext, returns { canCreateGallery, setCanCreateGallery }.

"use client";

import { useContext } from "react";
import { NavContext } from "../_context/NavContext";

export function useNav() {
  return useContext(NavContext);
}
