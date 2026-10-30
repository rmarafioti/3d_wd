// FieldLabel: a post field's label, its optional help note, and its character count, laid out so
// the count always sits right above the field, at its right edge: on a line of its own under the
// note when there is one (so the note keeps its full width), on the label's line when there isn't.
// Used by PostForm's fields and ImageField's Alt Text. (ParagraphField puts its count beside its
// format buttons, which sit above its textarea.)

import styles from "../_styling/postForm.module.css";

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
      {note && count && <div className={styles.countRow}>{count}</div>}
    </>
  );
}
