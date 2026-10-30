// ConfirmDialog: native <dialog> confirmation gate for destructive actions that can't be undone in
// one step: Delete Post on the post page. (A post's Active switch is reversible, so it is not
// gated.)
// Opens when mounted. It has no X (DialogCloseButton), so the site owner makes the choice: the
// confirm button calls onConfirm; "Cancel" and Esc call onClose. Never closes on an outside click.
// The parent unmounts it in either callback.

"use client";

import { useModalDialog } from "../_hooks/useModalDialog";

export default function ConfirmDialog({
  message,
  confirmLabel,
  onConfirm,
  onClose,
}) {
  const dialogRef = useModalDialog();

  return (
    // The close event fires for Cancel and Esc.
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
