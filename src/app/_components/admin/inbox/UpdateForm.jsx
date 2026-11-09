// UpdateForm (admin): an update's Title and Body, and its submit button. Used
// by the Send a Notification page and the Edit dialog.

"use client";

import { useState } from "react";
import TextField from "../../inbox/TextField";
import FormattedField from "../../formatting/FormattedField";
import { validateUpdate } from "../../../_lib/validation";

import styles from "../../../_styling/inbox.module.css";

const EMPTY_UPDATE = { title: "", body: "" };

// Built field by field, never spread from a response (docs/scaling.md §2).
function toPayload({ title, body }) {
  return { title: title.trim(), body: body.trim() };
}

function isSame(a, b) {
  return a.title.trim() === b.title.trim() && a.body.trim() === b.body.trim();
}

// initial: the update being edited, or nothing for a new one, whose submit then needs no change.
// onSubmit(payload) sends it and throws the ApiError on failure; onSuccess runs once it is sent.
export default function UpdateForm({
  initial = EMPTY_UPDATE,
  submitLabel,
  onSubmit,
  onSuccess,
}) {
  const [values, setValues] = useState({
    title: initial.title,
    body: initial.body,
  });
  const [titleTouched, setTitleTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  const errors = validateUpdate(values);
  const isValid = Object.keys(errors).length === 0;
  // Edit's Save waits for a change; a new update starts empty, so it can't match.
  const isUnchanged = initial !== EMPTY_UPDATE && isSame(values, initial);
  const fieldErrors = serverError?.fields ?? {};

  function change(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!isValid || isUnchanged || submitting) return;

    setSubmitting(true);
    setServerError(null);
    try {
      await onSubmit(toPayload(values));
      onSuccess();
    } catch (err) {
      // Everything typed stays in the form.
      setServerError({ message: err.message, fields: err.fields });
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className={styles.form}>
      <TextField
        label="Title"
        max={120}
        value={values.title}
        onChange={(value) => change("title", value)}
        onBlur={() => setTitleTouched(true)}
        message={(titleTouched && errors.title) || fieldErrors.title}
      />
      <FormattedField
        label="Body"
        max={10000}
        value={values.body}
        onChange={(value) => change("body", value)}
        serverError={fieldErrors.body}
      />
      <button
        type="submit"
        disabled={!isValid || isUnchanged || submitting}
        className={styles.submitButton}
      >
        {submitLabel}
      </button>
      {serverError && <p>{serverError.message}</p>}
    </form>
  );
}
