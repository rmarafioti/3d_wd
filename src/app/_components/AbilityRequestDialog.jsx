// AbilityRequestDialog (site owner): the request form saying where on the website an ability's
// content should appear (docs/flows.md → Request dialog): the website's posts, once they have a
// first post, or each new gallery. heading and message say which; onSubmit sends the trimmed note
// (the ability's or the gallery's request route), then onSent runs.
// Two modes:
// - The first form, without onCancel: required. It has no X and no Cancel, and blocks Esc, so the
//   only way out is sending it. The dashboard mounts it while the form is pending and unmounts it
//   once onSent's refetch shows it sent.
// - An edit, with onCancel (a change of mind, Feature 13): it starts from initialNote, Cancel and
//   Esc close it, and Submit waits until the note has changed (Rich, 2026-11-02).

"use client";

import { useId, useState } from "react";
import { useModalDialog } from "../_hooks/useModalDialog";
import { validateRequestNote } from "../_lib/validation";
import CharacterCount from "./CharacterCount";
import FieldLabel from "./FieldLabel";

import styles from "../_styling/abilityRequestDialog.module.css";

const REQUEST_NOTE_MAX = 1000;

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
  // A gallery whose form was sent before Feature 12 has no note, so its edit starts empty.
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
