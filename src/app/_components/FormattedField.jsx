// FormattedField: the paragraph editor for an update's body or a thread message, which keep their
// formatting and line breaks in the Client Portal.

"use client";

import ParagraphField from "./ParagraphField";

// The editor's note for text that shows in the Client Portal rather than on a website.
const NOTE = "Line breaks you add will show.";

export default function FormattedField({
  label,
  max,
  value,
  onChange,
  serverError,
}) {
  return (
    <ParagraphField
      // Names the format buttons for screen readers: "Bold text in message".
      name={label.toLowerCase()}
      label={label}
      note={NOTE}
      max={max}
      value={{ text: value }}
      onChange={(patch) => onChange(patch.text)}
      serverError={serverError}
    />
  );
}
