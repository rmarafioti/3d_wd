// MobileShapePicker (site owner): the Shape radio group for a gallery's mobile crops, shared by the
// first mobile crop dialog and "Edit mobile shape". value is a MOBILE_SHAPES entry.

"use client";

import { useId } from "react";
import { MOBILE_SHAPES } from "../_lib/crops";

import styles from "../_styling/galleryForm.module.css";

export default function MobileShapePicker({ value, onChange }) {
  const name = useId();
  return (
    <fieldset className={styles.shapes}>
      <legend>Shape</legend>
      {MOBILE_SHAPES.map((option) => (
        <label key={option.label} className={styles.shapeOption}>
          <input
            type="radio"
            name={name}
            checked={value === option}
            onChange={() => onChange(option)}
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}
