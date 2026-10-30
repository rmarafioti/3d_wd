// DialogCloseButton: the shared X in the top right corner of every dialog, except these:
// CredentialRevealModal keeps its labelled Close button; SignInForm's "Signing in…" shows the X
// only once it turns into an error; ConfirmDialog and PostStepDialog's smaller dialogs end in their
// own Cancel button instead. By default it closes through the dialog itself, so the X and Esc both
// fire the dialog's close event and reach the same onClose handler. PostStepDialog's review view
// passes onClick instead, since closing it may first ask "Are you sure…?".
// Icon-only, so it is named "Close" for screen readers.

"use client";

import { IoClose } from "react-icons/io5";

import styles from "../_styling/dialogCloseButton.module.css";

export default function DialogCloseButton({ dialogRef, onClick }) {
  return (
    <button
      // type="button" so it never submits a form inside the dialog.
      type="button"
      aria-label="Close"
      onClick={onClick ?? (() => dialogRef.current.close())}
      className={styles.closeButton}
    >
      <IoClose aria-hidden="true" />
    </button>
  );
}
