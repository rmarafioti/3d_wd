// DialogCloseButton: the shared X in a dialog's top right corner (CLAUDE.md lists the dialogs
// without one). Icon-only, so it is named "Close" for screen readers.

"use client";

import { IoClose } from "react-icons/io5";

import styles from "../_styling/dialogCloseButton.module.css";

export default function DialogCloseButton({ dialogRef, onClick }) {
  return (
    <button
      // type="button" so it never submits a form inside the dialog.
      type="button"
      aria-label="Close"
      // By default it closes through the dialog itself, so the X and Esc both fire its close event
      // and reach the same onClose. onClick is for a dialog that may ask "Are you sure…?" first.
      onClick={onClick ?? (() => dialogRef.current.close())}
      className={styles.closeButton}
    >
      <IoClose aria-hidden="true" />
    </button>
  );
}
