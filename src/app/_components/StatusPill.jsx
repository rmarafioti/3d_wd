// StatusPill: the shared "active" / "inactive" indicator for accounts, websites and posts.
// className is for the caller's own spacing around the pill; its look lives here.

import styles from "../_styling/statusPill.module.css";

export default function StatusPill({ active, className = "" }) {
  return (
    <span
      className={`${styles.pill} ${active ? styles.active : styles.inactive} ${className}`}
    >
      {active ? "active" : "inactive"}
    </span>
  );
}
