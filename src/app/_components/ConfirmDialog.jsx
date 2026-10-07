// ConfirmDialog: native <dialog> confirmation gate for destructive actions (Archive Post).
// Opens when mounted. The confirm button calls onConfirm; "Cancel" (its Close button) and Esc
// call onClose. Never closes on an outside click. The parent unmounts it in either callback.

"use client";

import { useEffect, useRef } from "react";

export default function ConfirmDialog({
  message,
  confirmLabel,
  onConfirm,
  onClose,
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog.open) dialog.showModal();
  }, []);

  return (
    // The close event fires for both the Cancel button and Esc.
    <dialog ref={dialogRef} onClose={onClose}>
      <p>{message}</p>
      <button type="button" onClick={onConfirm}>
        {confirmLabel}
      </button>
      <button type="button" onClick={() => dialogRef.current.close()}>
        Cancel
      </button>
    </dialog>
  );
}
