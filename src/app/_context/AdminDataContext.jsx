// AdminDataContext: the admin's accounts and websites, fetched once by the admin layout, so the
// Accounts aside and the pages under /admin read and refresh the same lists.

"use client";

import { createContext } from "react";
import { useAccounts } from "../_hooks/useAccounts";
import { useAllWebsites } from "../_hooks/useAllWebsites";

export const AdminDataContext = createContext(null);

export function AdminDataProvider({ children }) {
  const accounts = useAccounts();
  const websites = useAllWebsites();

  return (
    <AdminDataContext.Provider value={{ accounts, websites }}>
      {children}
    </AdminDataContext.Provider>
  );
}
