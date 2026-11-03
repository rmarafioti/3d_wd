// Navbar: site navigation in two rows (Rich, 2026-11-03). The top row holds HomeLink,
// DashboardTitle and AuthButton. Once signed in, a second row under a line holds the dashboard's
// links: the admin's Create an Account and Audit Events, the site owner's Create a Post and, once
// some website has Photo Galleries (NavContext), Create a Gallery, which open their form on
// /dashboard (?create=). At phone width the links row and the top row's Sign out are hidden, and a
// hamburger opens them as a menu over the page, above the asides. The menu is a disclosure, like
// ActionsMenu: it closes on Esc (focus back on the hamburger), on a click outside it, and once a
// link is picked. Signed out (the landing and sign-in pages) it is the top row alone.

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { RxCross2, RxHamburgerMenu } from "react-icons/rx";
import { useAuth } from "../_hooks/useAuth";
import { useNav } from "../_hooks/useNav";
import HomeLink from "../_components/HomeLink";
import DashboardTitle from "../_components/DashboardTitle";
import AuthButton from "../_components/AuthButton";

import styles from "../_styling/navbar.module.css";

// The signed-in user's links, or null when no one is signed in. next/link is fine here: every
// dashboard page has the nonce policy, so a client-side route between them keeps the right one
// (the plain-link rule is for static → session pages).
function navLinks(user, canCreateGallery) {
  if (!user) return null;
  if (user.role === "admin") {
    return [
      { label: "Create an Account", href: "/admin/createAccount" },
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
