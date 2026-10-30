// Toggle: the shared on/off switch for every on / off state (a post's status now; add-ons
// and accounts or websites later). A native <button role="switch">, so keyboard, focus and
// disabled come built in. Fully controlled: the caller passes checked (the saved value) and
// onChange receives the requested value; the switch only moves when the caller's checked changes.
// Named by label (aria-label): name it for what "on" means ("Published"), not the setting ("Status").
// offLabel / onLabel are optional words either side of the switch, hidden from screen readers
// because the switch already announces its own on/off state. statusColors fills the track with
// StatusPill's colours (green on, red off) for a switch that sets a status shown in a pill (a
// post's Published switch); other switches keep the plain grey track.

"use client";

import styles from "../_styling/toggle.module.css";

export default function Toggle({
  label,
  offLabel,
  onLabel,
  checked,
  onChange,
  disabled,
  statusColors = false,
}) {
  let trackColor = "";
  if (statusColors) trackColor = checked ? styles.statusOn : styles.statusOff;

  return (
    <span className={styles.toggleRow}>
      {offLabel && <span aria-hidden="true">{offLabel}</span>}
      <button
        // type="button" so the switch never submits a form it sits inside.
        type="button"
        role="switch"
        aria-label={label}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`${styles.toggleContainer} ${trackColor}`}
      >
        <span
          className={`${styles.toggleButton} ${checked ? styles.toggled : ""}`}
        />
      </button>
      {onLabel && <span aria-hidden="true">{onLabel}</span>}
    </span>
  );
}
