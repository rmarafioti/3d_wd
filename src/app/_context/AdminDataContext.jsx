// AdminDataContext: the admin's accounts and websites, fetched once by the admin layout and shared
// by everything under /admin. The Accounts aside (in the layout) and Create an Account (in the
// page) both read and refresh the same lists, so a change made in one shows in the other.

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
