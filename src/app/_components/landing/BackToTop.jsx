// The landing page's Back to top button: shown once the visitor has scrolled past the first
// screen, it returns to the top and moves focus to the hero heading.

"use client";

import { useEffect, useState } from "react";
import { FiArrowUp } from "react-icons/fi";
import { scrollToTop } from "../../_lib/landingSections";

import styles from "../../_styling/landingNav.module.css";

export default function BackToTop() {
  const [isPastFirstScreen, setIsPastFirstScreen] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setIsPastFirstScreen(window.scrollY > window.innerHeight);
    }
    // A reload part way down the page starts past the first screen.
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!isPastFirstScreen) return null;

  return (
    <button
      type="button"
      aria-label="Back to top"
      title="Back to top"
      onClick={scrollToTop}
      className={styles.backToTop}
    >
      <FiArrowUp aria-hidden="true" />
    </button>
  );
}
