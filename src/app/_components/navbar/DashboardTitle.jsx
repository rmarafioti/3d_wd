// DashboardTitle: Navbar client island naming the signed-in user's dashboard. AuthContext is filled
// only by the role-gated dashboard layouts, so this shows nothing on the landing and sign-in pages.

"use client";

import { useAuth } from "../../_hooks/useAuth";

import styles from "../../_styling/navbar.module.css";

export default function DashboardTitle() {
  const { user } = useAuth();

  if (!user) return null;
  if (user.role === "admin") {
    return <p className={styles.dashboardTitle}>Admin Dashboard</p>;
  }
  return <p className={styles.dashboardTitle}>{user.name}&apos;s Dashboard</p>;
}
