// FieldLabel: a field's label, optional help note and character count, with the count always right
// above the field at its right edge.

import styles from "../../_styling/postForm.module.css";

export default function FieldLabel({ htmlFor, label, note, count }) {
  return (
    <>
      <div className={styles.labelRow}>
        <label htmlFor={htmlFor}>{label}</label>
        {!note && count}
      </div>
      {note && (
        <p className={styles.message}>
          <i>*{note}</i>
        </p>
      )}
      {/* Under the note, on a line of its own, so the note keeps its full width. */}
      {note && count && <div className={styles.countRow}>{count}</div>}
    </>
  );
}
