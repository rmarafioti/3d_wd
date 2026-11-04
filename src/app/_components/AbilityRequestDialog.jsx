// AbilityRequestDialog (site owner): the request form saying where on the website an ability's
// content or a gallery should appear, sent for the first time or edited.

"use client";

import { useId, useState } from "react";
import { useModalDialog } from "../_hooks/useModalDialog";
import { validateRequestNote } from "../_lib/validation";
import CharacterCount from "./CharacterCount";
import FieldLabel from "./FieldLabel";

import styles from "../_styling/abilityRequestDialog.module.css";

const REQUEST_NOTE_MAX = 1000;

// Without onCancel it is the first form, which is required: no X, no Cancel and Esc blocked, so
// sending it is the only way out. With onCancel it is an edit of the note already sent.
export default function AbilityRequestDialog({
  heading,
  message,
  initialNote,
  onSubmit,
  onSent,
  onCancel,
}) {
  const dialogRef = useModalDialog();
  const titleId = useId();
  const noteId = useId();
  const countId = useId();
  // A gallery whose form was sent before notes were kept has no note, so its edit starts empty.
  const [requestNote, setRequestNote] = useState(initialNote ?? "");
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const [serverError, setServerError] = useState(null);

  const errors = validateRequestNote({ requestNote });
  const fieldError =
    (touched && errors.requestNote) || serverError?.fields?.requestNote;
  const unchanged = requestNote.trim() === (initialNote ?? "").trim();
  const canSubmit =
    !sending && Object.keys(errors).length === 0 && !(onCancel && unchanged);

  const submitButton = (
    <button type="submit" disabled={!canSubmit}>
      {sending ? "Sending…" : "Submit"}
    </button>
  );

  // Esc is Cancel in an edit; the first form blocks it.
  function handleEscape(event) {
    event.preventDefault();
    if (onCancel) onCancel();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSending(true);
    setServerError(null);
    try {
      await onSubmit(requestNote.trim());
      onSent();
    } catch (err) {
      setServerError(err);
      setSending(false);
    }
  }

  return (
    // closedby="none" stops Chrome closing on a repeated Esc, which it allows even when the cancel
    // event is prevented; an edit closes through onCancel instead. A modal <dialog> never closes
    // on an outside click.
    <dialog
      ref={dialogRef}
      closedby="none"
      onCancel={handleEscape}
      aria-labelledby={titleId}
    >
      <form onSubmit={handleSubmit} noValidate className={styles.form}>
        <h2 id={titleId} className={styles.heading}>
          {heading}
        </h2>
        <p className={styles.message}>{message}</p>
        <FieldLabel
          htmlFor={noteId}
          label="Where on your website"
          count={
            <CharacterCount
              id={countId}
              value={requestNote}
              max={REQUEST_NOTE_MAX}
            />
          }
        />
        <textarea
          id={noteId}
          value={requestNote}
          maxLength={REQUEST_NOTE_MAX}
          rows={6}
          aria-describedby={countId}
          className={styles.noteField}
          onChange={(event) => setRequestNote(event.target.value)}
          onBlur={() => setTouched(true)}
        />
        {fieldError && <p className="fieldError">{fieldError}</p>}
        {onCancel ? (
          <div className="dialogButtons">
            <button type="button" onClick={onCancel}>
              Cancel
            </button>
            {submitButton}
          </div>
        ) : (
          submitButton
        )}
        {serverError && <p>{serverError.message}</p>}
      </form>
    </dialog>
  );
}
