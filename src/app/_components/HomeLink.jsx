// HomeLink: Navbar client island, the "3D Web Dev" link. It leads to the signed-in user's
// dashboard, or to the landing page when no one is signed in. AuthContext is filled only by the
// role-gated dashboard layouts, so on the landing and sign-in pages it always leads to /.

"use client";

import Link from "next/link";
import { useAuth } from "../_hooks/useAuth";
import { HOME_BY_ROLE } from "../_lib/roles";

export default function HomeLink() {
  const { user } = useAuth();

  return (
    <Link
      href={user ? HOME_BY_ROLE[user.role] : "/"}
      aria-label="3D Web Dev home"
    >
      3D Web Dev
    </Link>
  );
}
