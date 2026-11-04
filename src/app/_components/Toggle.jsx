// Toggle: the shared on/off switch, a native <button role="switch"> the caller controls: it moves
// only when the caller's checked changes.

"use client";

import styles from "../_styling/toggle.module.css";

// label names it for what "on" means ("Published"), not the setting ("Status"). offLabel / onLabel
// are words either side, hidden from screen readers since the switch announces its own state.
// statusColors fills the track with Pill's green (on) and red (off), for a switch that sets a
// status shown in a pill.
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
