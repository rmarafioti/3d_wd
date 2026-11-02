// ConfirmDialog: native <dialog> confirmation gate for actions that can't be undone in one step:
// Delete Post on the post page and the dashboard, and cancelling a post in Create / Edit Post,
// which drops what was entered. (A post's Draft / Published switch is reversible, so it is not
// gated.)
// Opens when mounted. It has no X (DialogCloseButton), so the user makes the choice: the confirm
// button calls onConfirm; the other button (cancelLabel, "Cancel" unless given) and Esc call
// onClose. Never closes on an outside click. The parent unmounts it in either callback.

"use client";

import { useModalDialog } from "../_hooks/useModalDialog";

import styles from "../_styling/confirmDialog.module.css";

export default function ConfirmDialog({
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onClose,
}) {
  const dialogRef = useModalDialog();

  return (
    // The close event fires for the cancel button and Esc.
    <dialog ref={dialogRef} onClose={onClose} className={styles.confirmDialog}>
      <p>{message}</p>
      {/* Cancel on the left, the action on the right, as in every dialog (Rich, 2026-11-02). */}
      <div className="dialogButtons">
        <button type="button" onClick={() => dialogRef.current.close()}>
          {cancelLabel}
        </button>
        <button type="button" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
