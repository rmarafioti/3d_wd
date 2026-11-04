// ConfirmDialog: the shared confirmation gate for an action that can't be undone in one step. Opens
// when mounted, has no X, and the parent unmounts it in onConfirm or onClose.

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
      {/* Cancel on the left, the action on the right, as in every dialog. */}
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
