// SubmitProgressDialog: native <dialog> shown over Create / Edit Post and Create / Edit a Gallery
// while Submit runs (docs/flows.md → Create a Post), naming the step under way ("Preparing
// photos…", "Uploading photos (1 of 3)…", "Saving your post…") with three animated dots. It has
// no X and blocks Esc, since a step can't be stopped part way; the parent unmounts it when Submit
// ends, with a success or an error.

"use client";

import { useId } from "react";
import { useModalDialog } from "../_hooks/useModalDialog";

import styles from "../_styling/submitProgressDialog.module.css";

export default function SubmitProgressDialog({ message }) {
  const dialogRef = useModalDialog();
  const messageId = useId();

  return (
    // closedby="none" stops Chrome closing on a repeated Esc, which it allows even when the cancel
    // event is prevented. A modal <dialog> never closes on an outside click.
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
