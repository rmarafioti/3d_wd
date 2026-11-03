// PlacementPill: where a site owner's content sits on their website (docs/api.md → Notes,
// Abilities, issue #71): "requested" once its request message is sent, "live" once the admin has
// placed it and the site owner approved the mock-up, nothing before the message. Posts have one,
// on their ability; each gallery has its own. Shared by the site owner's Abilities aside and
// gallery page and the admin's account list. Its colours are AbilityPill's.

import styles from "../_styling/statusPill.module.css";

export default function PlacementPill({ placement }) {
  if (!placement) return null;
  return (
    <span className={`${styles.pill} ${styles[placement]}`}>{placement}</span>
  );
}
