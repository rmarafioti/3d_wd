// useSiteOwnerData (site owner): reads SiteOwnerDataContext, returns the unchanged result of
// useWebsites(): { data, loading, error, refetch }.

"use client";

import { useContext } from "react";
import { SiteOwnerDataContext } from "../_context/SiteOwnerDataContext";

export function useSiteOwnerData() {
  return useContext(SiteOwnerDataContext);
}
