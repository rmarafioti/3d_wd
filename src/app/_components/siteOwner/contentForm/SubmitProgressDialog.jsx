// SubmitProgressDialog: the dialog over the post and gallery forms while Submit runs, naming the
// step under way with three animated dots. The parent unmounts it when Submit ends.

"use client";

import { useId } from "react";
import { useModalDialog } from "../../../_hooks/useModalDialog";

import styles from "../../../_styling/submitProgressDialog.module.css";

export default function SubmitProgressDialog({ message }) {
  const dialogRef = useModalDialog();
  const messageId = useId();

  return (
    // No X, and Esc is blocked, since a step can't be stopped part way. closedby="none" stops Chrome
    // closing on a repeated Esc, which it allows even when the cancel event is prevented. A modal
    // <dialog> never closes on an outside click.
    <dialog
      ref={dialogRef}
      closedby="none"
      onCancel={(event) => event.preventDefault()}
      aria-labelledby={messageId}
      className={styles.progressDialog}
    >
      {/* The step names the dialog, and role="status" announces each new one to screen readers. */}
      <p id={messageId} role="status" className={styles.message}>
        {message}
      </p>
      <span className={styles.dots} aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
    </dialog>
  );
}
