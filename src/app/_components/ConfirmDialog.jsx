// ConfirmDialog: native <dialog> confirmation gate for destructive actions that can't be undone in
// one step. Kept for future use: nothing calls it yet (a post's Active switch is reversible, so it
// is not gated).
// Opens when mounted. The confirm button calls onConfirm; "Cancel", the X (DialogCloseButton)
// and Esc call onClose. Never closes on an outside click. The parent unmounts it in either callback.

"use client";

import { useModalDialog } from "../_hooks/useModalDialog";
import DialogCloseButton from "./DialogCloseButton";

export default function ConfirmDialog({
  message,
  confirmLabel,
  onConfirm,
  onClose,
}) {
  const dialogRef = useModalDialog();

  return (
    // The close event fires for Cancel, the X and Esc.
    <dialog ref={dialogRef} onClose={onClose}>
      <DialogCloseButton dialogRef={dialogRef} />
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
