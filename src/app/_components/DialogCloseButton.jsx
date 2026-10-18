// DialogCloseButton: the shared X in the top right corner of every dialog, except
// CredentialRevealModal, which keeps its labelled Close button. It closes through the dialog
// itself, so the X and Esc both fire the dialog's close event and reach the same onClose handler.
// Icon-only, so it is named "Close" for screen readers.

"use client";

import { IoClose } from "react-icons/io5";

import styles from "../_styling/dialogCloseButton.module.css";

export default function DialogCloseButton({ dialogRef }) {
  return (
    <button
      // type="button" so it never submits a form inside the dialog.
      type="button"
      aria-label="Close"
      onClick={() => dialogRef.current.close()}
      className={styles.closeButton}
    >
      <IoClose aria-hidden="true" />
    </button>
  );
}
