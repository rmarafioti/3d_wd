// ReplyDialog: the Reply dialog on a thread, a Message and Send reply. Opens when mounted; the
// parent unmounts it once the reply is sent or in onClose.

"use client";

import { useId, useState } from "react";
import { useModalDialog } from "../../_hooks/useModalDialog";
import DialogCloseButton from "../dialogs/DialogCloseButton";
import FormattedField from "../formatting/FormattedField";
import { formattedTextError } from "../../_lib/validation";

import styles from "../../_styling/inbox.module.css";

// The backend's 409 for a reply to a full thread (docs/api.md → Error messages).
const THREAD_FULL_STATUS = 409;

// subject: the thread's, for the title. onSubmit(message) sends the reply, throwing the ApiError on
// failure; onSent runs once it is sent. onStartNew offers a new thread when this one is full.
export default function ReplyDialog({
  subject,
  onSubmit,
  onSent,
  onStartNew,
  onClose,
}) {
  const dialogRef = useModalDialog();
  const titleId = useId();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const messageError = formattedTextError(message, "Message", 5000);
  const isFull = error?.status === THREAD_FULL_STATUS;

  async function handleSubmit(event) {
    event.preventDefault();
    if (messageError || sending) return;

    setSending(true);
    setError(null);
    try {
      await onSubmit(message.trim());
      onSent();
    } catch (err) {
      // What was typed stays in the editor.
      setError(err);
      setSending(false);
    }
  }

  return (
    // The close event fires for both the X and Esc.
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby={titleId}
      className={styles.formDialog}
    >
      <DialogCloseButton dialogRef={dialogRef} />
      <h2 id={titleId} className={styles.heading}>
        Reply to {subject}
      </h2>
      <form onSubmit={handleSubmit} noValidate className={styles.form}>
        <FormattedField
          label="Message"
          max={5000}
          value={message}
          onChange={setMessage}
          serverError={error?.fields?.message}
        />
        <button
          type="submit"
          disabled={Boolean(messageError) || sending}
          className={styles.submitButton}
        >
          {sending ? "Sending…" : "Send reply"}
        </button>
        {error && <p>{error.message}</p>}
        {isFull && (
          <button type="button" onClick={onStartNew}>
            Start a new thread
          </button>
        )}
      </form>
    </dialog>
  );
}
