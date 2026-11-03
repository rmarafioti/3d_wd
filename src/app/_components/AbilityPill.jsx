// AbilityPill: an ability's state as a pill (docs/api.md → Notes, Abilities): its status, "added"
// or "live", or "off" while live and the site owner has turned it off. Where its content goes is
// PlacementPill's. With prompts (the site owner's Abilities aside) it also says what to do next:
// "Add ?" for an ability not added (ability undefined) and "Turn On ?" in place of "off". Shared by
// the site owner's Abilities aside and the admin's account list. StatusPill stays the two-state
// pill.

import { abilityPillLabel } from "../_lib/abilities";

import styles from "../_styling/statusPill.module.css";

// Each prompt takes the look of the state it stands for, so no new colours: "Add ?" an added
// ability's white, "Turn On ?" off's red.
const PROMPT_STYLES = { "Add ?": "added", "Turn On ?": "off" };

export default function AbilityPill({
  ability,
  prompts = false,
  className = "",
}) {
  const label = abilityPillLabel(ability, { prompts });
  if (!label) return null;
  return (
    <span
      className={`${styles.pill} ${styles[PROMPT_STYLES[label] ?? label]} ${className}`}
    >
      {label}
    </span>
  );
}
