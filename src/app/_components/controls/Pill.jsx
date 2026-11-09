// Pill: a small coloured label for a state (published / draft, active / inactive, an ability's
// status, a placement). The caller passes its words and a tone: green, red, purple or plain.

import styles from "../../_styling/pill.module.css";

// className is for the caller's own spacing around the pill; its look lives here.
export default function Pill({ label, tone, className = "" }) {
  return (
    <span className={`${styles.pill} ${styles[tone]} ${className}`}>
      {label}
    </span>
  );
}
