// StatusPill: the shared on / off indicator for accounts and websites ("active" / "inactive", the
// default words) and posts ("published" / "draft", passed as onLabel / offLabel, like Toggle's).
// className is for the caller's own spacing around the pill; its look lives here.

import styles from "../_styling/statusPill.module.css";

export default function StatusPill({
  active,
  onLabel = "active",
  offLabel = "inactive",
  className = "",
}) {
  return (
    <span
      className={`${styles.pill} ${active ? styles.active : styles.inactive} ${className}`}
    >
      {active ? onLabel : offLabel}
    </span>
  );
}
