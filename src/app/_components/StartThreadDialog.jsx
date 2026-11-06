// StartThreadDialog: starts a thread, with a Subject and a first Message. The admin's names the site
// owner it goes to; the site owner's goes to the admin. Opens when mounted; the parent unmounts it.

"use client";

import { useId, useState } from "react";
import { useModalDialog } from "../_hooks/useModalDialog";
import DialogCloseButton from "./DialogCloseButton";
import TextField from "./TextField";
import FormattedField from "./FormattedField";
import { validateNewThread } from "../_lib/validation";

import styles from "../_styling/inbox.module.css";

// title: the dialog's heading. onSubmit({ subject, message }) starts the thread and returns it,
// throwing the ApiError on failure; onStarted(thread) runs once it is started.
export default function StartThreadDialog({
  title,
  onSubmit,
  onStarted,
  onClose,
}) {
  const dialogRef = useModalDialog();
  const titleId = useId();
  const [values, setValues] = useState({ subject: "", message: "" });
  const [subjectTouched, setSubjectTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  const errors = validateNewThread(values);
  const isValid = Object.keys(errors).length === 0;
  const fieldErrors = serverError?.fields ?? {};

  function change(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!isValid || submitting) return;

    setSubmitting(true);
    setServerError(null);
    try {
      const thread = await onSubmit({
        subject: values.subject.trim(),
        message: values.message.trim(),
      });
      onStarted(thread);
    } catch (err) {
      // Everything typed stays in the form.
      setServerError({ message: err.message, fields: err.fields });
      setSubmitting(false);
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
        {title}
      </h2>
      <form onSubmit={handleSubmit} noValidate className={styles.form}>
        <TextField
          label="Subject"
          max={120}
          value={values.subject}
          onChange={(value) => change("subject", value)}
          onBlur={() => setSubjectTouched(true)}
          message={(subjectTouched && errors.subject) || fieldErrors.subject}
        />
        <FormattedField
          label="Message"
          max={5000}
          value={values.message}
          onChange={(value) => change("message", value)}
          serverError={fieldErrors.message}
        />
        <button
          type="submit"
          disabled={!isValid || submitting}
          className={styles.submitButton}
        >
          Send
        </button>
        {serverError && <p>{serverError.message}</p>}
        {/* The admin's account has no field of its own, so its message goes here. */}
        {fieldErrors.accountId && <p>{fieldErrors.accountId}</p>}
      </form>
    </dialog>
  );
}
