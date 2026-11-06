// PublishDateField: a draft's publish date, a day in the site owner's own time zone, in the post and
// gallery forms and on their pages (PublishDateEditor). Stateless: its caller holds the value.

"use client";

import { useId } from "react";
import { earliestPublishDate } from "../_lib/publishAt";

import styles from "../_styling/postForm.module.css";

// onChange receives the field's new value. note is the caller's hint, under the field. message is
// the field's error, if any. Clear empties the field unless onClear says otherwise (the page clears
// the saved date), and works only while canClear. Alone (the forms) it shows only then; beside
// onSet's "Set publish date" (the pages, which save only on that click) both always show, disabled
// when they can't act. busy disables both while a save is in flight.
export default function PublishDateField({
  publishDate,
  onChange,
  onBlur,
  message,
  note,
  canClear = publishDate !== "",
  onClear = () => onChange(""),
  onSet,
  setDisabled = false,
  busy = false,
}) {
  const id = useId();

  return (
    <div className={styles.publishDate}>
      <p className={styles.message}>
        <i>*Keep it as a draft, or pick a date for it to publish by itself.</i>
      </p>
      <label htmlFor={id}>Date</label>
      {/* The browser's picker starts at tomorrow; a typed earlier date still gets the message. */}
      <input
        id={id}
        type="date"
        min={earliestPublishDate()}
        value={publishDate}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
      {message && <p className="fieldError">{message}</p>}
      {(canClear || onSet) && (
        <div className={styles.publishDateButtons}>
          <button
            type="button"
            onClick={onClear}
            disabled={!canClear || busy}
            className={styles.clearButton}
          >
            Clear
          </button>
          {onSet && (
            <button
              type="button"
              onClick={onSet}
              disabled={setDisabled || busy}
            >
              Set publish date
            </button>
          )}
        </div>
      )}
      <p className={styles.message}>
        <i>*{note}</i>
      </p>
    </div>
  );
}
