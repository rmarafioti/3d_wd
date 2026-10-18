// AuthButton: Navbar client island. "Sign in" link when no user in context, "Sign out" when there is one.

"use client";

import Link from "next/link";
import { apiFetch } from "../_lib/apiFetch";
import { useAuth } from "../_hooks/useAuth";

import styles from "../_styling/navbar.module.css";

export default function AuthButton() {
  const { user, setUser } = useAuth();

  async function handleSignOut() {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Sign out locally even if the request fails; the cookie expires on its own within 24 hours.
    } finally {
      setUser(null);
      // A full page load, not router.push: the client router cache may still hold the proxy's
      // "signed in, go to /dashboard" redirect for /, which would bounce the user back to the
      // dashboard. A full load asks the server, so the proxy sees the cookie is gone.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/");
    }
  }

  if (!user)
    return (
      <Link href="/sign-in" className={styles.signButton}>
        Sign in
      </Link>
    );

  return (
    <button type="button" onClick={handleSignOut} className={styles.signButton}>
      Sign out
    </button>
  );
}
