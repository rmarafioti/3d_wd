// AdminLayout: role-gates /admin (site owners go to /dashboard; UX only, the backend enforces access),
// then provides the admin data and renders the page with the Accounts aside.

"use client";

import { useRoleGate } from "../_hooks/useRoleGate";
import { AdminDataProvider } from "../_context/AdminDataContext";
import AccountsAside from "../_components/AccountsAside";

import styles from "../_styling/accountsAside.module.css";

export default function AdminLayout({ children }) {
  const { loading, error } = useRoleGate("admin");

  if (error) return <p>{error.message}</p>;
  if (loading) return <p>Loading…</p>;
  return (
    <AdminDataProvider>
      <div className={styles.adminLayout}>
        {children}
        <AccountsAside />
      </div>
    </AdminDataProvider>
  );
}
