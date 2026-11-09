// TextField: a required, limited one-line field in the inbox forms (an update's title, a thread's
// subject): its label and count, the input, and its message.

"use client";

import { useId } from "react";
import FieldLabel from "../fields/FieldLabel";
import CharacterCount from "../fields/CharacterCount";

export default function TextField({
  label,
  max,
  value,
  onChange,
  onBlur,
  message,
}) {
  const id = useId();
  return (
    <>
      <FieldLabel
        htmlFor={id}
        label={label}
        count={<CharacterCount id={`${id}-count`} value={value} max={max} />}
      />
      <input
        id={id}
        type="text"
        maxLength={max}
        aria-describedby={`${id}-count`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
      {message && <p className="fieldError">{message}</p>}
    </>
  );
}
