// CharacterCount: "42 / 100" beside a limited text field's label, so the site owner sees how much
// room is left. It counts value.length, as the field's maxLength does. The field points at it with
// aria-describedby={id}, so screen readers hear the count with the field.

import styles from "../_styling/postForm.module.css";

export default function CharacterCount({ id, value, max }) {
  return (
    <span id={id} className={styles.characterCount}>
      {value.length} / {max}
    </span>
  );
}
