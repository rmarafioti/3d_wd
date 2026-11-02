// AbilityPill: an ability's state as a pill (docs/api.md → Notes, Abilities): "requested" while a
// request waits, otherwise "off" while the site owner has turned it off, otherwise its status,
// "added" or "live". Shared by the
// site owner's Abilities aside and the admin's account list. StatusPill stays the two-state pill.

import { abilityPillLabel } from "../_lib/abilities";

import styles from "../_styling/statusPill.module.css";

export default function AbilityPill({ ability, className = "" }) {
  const label = abilityPillLabel(ability);
  return (
    <span className={`${styles.pill} ${styles[label]} ${className}`}>
      {label}
    </span>
  );
}
