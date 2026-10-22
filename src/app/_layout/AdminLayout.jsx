// Admin layout (client): calls GET /api/auth/me, stores the user in AuthContext,
// redirects site owners to /dashboard. UX only — the backend enforces access.
// Once the role is confirmed, it provides the admin data (AdminDataContext) to every admin route
// and renders the Accounts aside over the top right of the page, inside the layout's wrapper so it
// starts below the Navbar.

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
