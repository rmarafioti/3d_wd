// A landing page section that fades up into place as it is scrolled into view, and fades out
// upward as it leaves the top of the screen. Rendered visible by the server, so it reads the
// same with no JavaScript.

"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../../_lib/landingSections";

import styles from "../../_styling/landing.module.css";

// A section counts as on screen only while it reaches the middle 40% of the screen, so the one
// leaving fades out well before it is gone and the next fades in once it is well in view.
const OBSERVER_OPTIONS = { rootMargin: "-30% 0px -30% 0px" };

// Where the section sits against the screen, and the class that places it there.
const POSITION_CLASS = {
  onScreen: null,
  below: styles.revealBelow,
  above: styles.revealAbove,
};

export default function RevealSection({ id, className, children }) {
  const sectionRef = useRef(null);
  const [position, setPosition] = useState("onScreen");

  useEffect(() => {
    if (prefersReducedMotion()) return;

    // The observer reports each section once on observe, so one off screen when the page loads
    // (out of sight) is placed there before it is ever seen.
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setPosition("onScreen");
        return;
      }
      setPosition(entry.boundingClientRect.top < 0 ? "above" : "below");
    }, OBSERVER_OPTIONS);
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const positionClass = POSITION_CLASS[position];
  const classes = positionClass ? `${className} ${positionClass}` : className;

  return (
    <section ref={sectionRef} id={id} className={classes}>
      {children}
    </section>
  );
}
