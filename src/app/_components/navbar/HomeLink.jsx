// HomeLink: the Navbar's "3D | WD" link, to the signed-in user's dashboard or, signed out, to /.
// AuthContext is filled only by the dashboard layouts, so on the landing and sign-in pages it is /.

"use client";

import Link from "next/link";
import { useAuth } from "../../_hooks/useAuth";
import { HOME_BY_ROLE } from "../../_lib/roles";

import styles from "../../_styling/navbar.module.css";

export default function HomeLink() {
  const { user } = useAuth();

  return (
    <Link
      href={user ? HOME_BY_ROLE[user.role] : "/"}
      className={styles.homeLink}
      aria-label="3D Web Dev home"
    >
      3D | WD
    </Link>
  );
}
