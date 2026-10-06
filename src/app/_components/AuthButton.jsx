// AuthButton: Navbar client island. "Sign in" link when no user in context, "Sign out" when there is one.

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "../_lib/apiFetch";
import { useAuth } from "../_hooks/useAuth";

export default function AuthButton() {
  const router = useRouter();
  const { user, setUser } = useAuth();

  async function handleSignOut() {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Sign out locally even if the request fails; the cookie expires on its own within 24 hours.
    } finally {
      setUser(null);
      router.push("/");
    }
  }

  if (!user) return <Link href="/sign-in">Sign in</Link>;

  return (
    <button type="button" onClick={handleSignOut}>
      Sign out
    </button>
  );
}
