// MobileShapePicker (site owner): the Shape choices for a gallery's mobile crops (MOBILE_SHAPES:
// 4:5, 3:4, 9:16, 1:1), as a radio group. Shown in the gallery's first mobile crop dialog, where
// each choice previews live on the photo, and in the "Edit mobile shape" dialog, which changes the
// shape for every image (docs/flows.md → Consistent crops). value is a MOBILE_SHAPES entry.

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
