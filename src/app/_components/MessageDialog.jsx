// MessageDialog: native <dialog> for a one-line success or error message. Opens when mounted;
// closes with its Close button or Esc (native), never on an outside click. The parent
// unmounts it in onClose.

"use client";

import { useEffect, useRef } from "react";

export default function MessageDialog({ message, onClose }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog.open) dialog.showModal();
  }, []);

  return (
    // The close event fires for both the Close button and Esc.
    <dialog ref={dialogRef} onClose={onClose}>
      <p>{message}</p>
      <button type="button" onClick={() => dialogRef.current.close()}>
        Close
      </button>
    </dialog>
  );
}
