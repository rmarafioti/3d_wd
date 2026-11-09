// SelectAllCheckbox: a list's "Select all" box, ticked when every loaded item is and partly ticked
// when only some are. Shared by the mailboxes and Recently Deleted.

"use client";

import { useEffect, useRef } from "react";

export default function SelectAllCheckbox({
  label = "Select all",
  checked,
  indeterminate,
  onChange,
}) {
  const inputRef = useRef(null);

  // React has no prop for the partly ticked state; it is only a DOM property.
  useEffect(() => {
    inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={inputRef}
      type="checkbox"
      aria-label={label}
      checked={checked}
      onChange={onChange}
    />
  );
}
