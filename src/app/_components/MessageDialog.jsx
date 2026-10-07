// MessageDialog: native <dialog> for a one-line success or error message. Opens when mounted;
// closes with its Close button or Esc (native), never on an outside click. The parent
// unmounts it in onClose.

"use client";

import { useModalDialog } from "../_hooks/useModalDialog";

export default function MessageDialog({ message, onClose }) {
  const dialogRef = useModalDialog();

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
