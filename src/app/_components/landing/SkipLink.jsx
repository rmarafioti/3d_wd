// "Skip to content", the landing page's first Tab stop, hidden until focused: it jumps past both
// navbar rows to the page's main content. Rendered by the root layout, so it comes before the Navbar.

"use client";

import { usePathname } from "next/navigation";
import { MAIN_CONTENT_ID } from "../../_lib/landingSections";

import styles from "../../_styling/landingNav.module.css";

export default function SkipLink() {
  const pathname = usePathname();

  if (pathname !== "/") return null;

  return (
    <a href={`#${MAIN_CONTENT_ID}`} className={styles.skipLink}>
      Skip to content
    </a>
  );
}
