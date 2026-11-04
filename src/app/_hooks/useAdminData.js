// useAdminData (admin): reads AdminDataContext: { accounts, websites }, the results of useAccounts()
// and useAllWebsites().

"use client";

import { useContext } from "react";
import { AdminDataContext } from "../_context/AdminDataContext";

export function useAdminData() {
  return useContext(AdminDataContext);
}
