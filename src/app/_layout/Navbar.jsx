// Navbar: the home link, dashboard title, mail and trash icons and Sign in / out, then the
// signed-in user's links, which at phone width move into a hamburger menu.

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { RxCross2, RxHamburgerMenu } from "react-icons/rx";
import { GoTrash } from "react-icons/go";
import { useAuth } from "../_hooks/useAuth";
import { useNav } from "../_hooks/useNav";
import HomeLink from "../_components/HomeLink";
import DashboardTitle from "../_components/DashboardTitle";
import AuthButton from "../_components/AuthButton";
import MailLink from "../_components/MailLink";
import { DELETED_BY_ROLE } from "../_lib/roles";

import styles from "../_styling/navbar.module.css";

// The signed-in user's links, or null when no one is signed in. next/link is fine here: every
// dashboard page has the nonce policy, so a client-side route between them keeps the right one
// (the plain-link rule is for static → session pages).
function navLinks(user, canCreateGallery) {
  if (!user) return null;
  if (user.role === "admin") {
    return [
      { label: "Create an Account", href: "/admin/createAccount" },
      { label: "Send a Notification", href: "/admin/notifications" },
      { label: "Audit Events", href: "/admin/auditEvents" },
    ];
  }
  const links = [{ label: "Create a Post", href: "/dashboard?create=post" }];
  if (canCreateGallery) {
    links.push({
      label: "Create a Gallery",
      href: "/dashboard?create=gallery",
    });
  }
  return links;
}

export default function Navbar() {
  const { user } = useAuth();
  const { canCreateGallery } = useNav();
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef(null);
  const menuButtonRef = useRef(null);
  const links = navLinks(user, canCreateGallery);

  // Listens only while the phone menu is open.
  useEffect(() => {
    if (!menuOpen) return;
    function handlePointerDown(event) {
      if (!navRef.current.contains(event.target)) setMenuOpen(false);
    }
    function handleKeyDown(event) {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuButtonRef.current.focus();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const MenuIcon = menuOpen ? RxCross2 : RxHamburgerMenu;

  return (
    <nav ref={navRef} className={styles.nav}>
      <div className={styles.topRow}>
        <HomeLink />
        <DashboardTitle />
        <div className={styles.navActions}>
          {user && <MailLink role={user.role} />}
          {/* Recently Deleted, with no badge; it stays in the top row at phone width. */}
          {user && (
            <Link
              href={DELETED_BY_ROLE[user.role]}
              aria-label="Recently Deleted"
              title="Recently Deleted"
              className={styles.iconLink}
            >
              <GoTrash aria-hidden="true" />
            </Link>
          )}
          {/* Signed in, Sign out moves into the phone menu. */}
          <div className={links ? styles.desktopOnly : undefined}>
            <AuthButton />
          </div>
          {links && (
            <button
              ref={menuButtonRef}
              type="button"
              aria-label="Menu"
              aria-expanded={menuOpen}
              aria-controls="nav-links"
              onClick={() => setMenuOpen((current) => !current)}
              className={styles.menuButton}
            >
              <MenuIcon aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      {links && (
        <ul
          id="nav-links"
          className={`${styles.links} ${menuOpen ? styles.menuOpen : ""}`}
        >
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={styles.navLink}
              >
                {link.label}
              </Link>
            </li>
          ))}
          <li className={styles.menuSignOut}>
            <AuthButton className={styles.navLink} />
          </li>
        </ul>
      )}
    </nav>
  );
}
