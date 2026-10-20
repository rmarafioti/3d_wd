// LinkPanel (site owner): the panel for adding a link to a paragraph, or editing one from its
// links list (docs/flows.md → Paragraph formatting). Link text, Link URL, and a Bold toggle:
// links are bold by default, and bold is the only look a link can be given (the toolbar's Bold
// and Italic never touch a link). Like the other forms: each field's message (the contract's) shows once it
// has been left, and Add link / Update link stay disabled until both fields are valid. Update
// link also waits for a change (text, URL or look), so an unchanged link isn't rewritten.
// - Link text is locked when it came from highlighted words, so the site owner sees exactly
//   which words become the link; otherwise it is typed here (always, when editing).
// - aroundLevel: the bold / italic of a larger run the link sits in (typed by hand, or a link
//   added inside bold words). The link takes that look on and can't have one of its own inside
//   it (formats don't nest), so the Bold toggle shows it and is disabled, with a note.
// - A link's own italic (only possible typed by hand) is kept as it is when Bold is switched.
// onSave receives { text, url, level }, trimmed; the parent writes the markup.

"use client";

import { useId, useState } from "react";
import { MdFormatBold } from "react-icons/md";
import { validateParagraphLink } from "../_lib/validation";

import styles from "../_styling/postForm.module.css";

// The bold bit of a link's level (its marker length: 2 bold, 1 italic, 3 both).
const BOLD = 2;

const AROUND_NOTES = {
  1: "Italic from the words around it.",
  2: "Bold from the words around it.",
  3: "Bold and italic from the words around it.",
};

export default function LinkPanel({
  mode,
  initial,
  textLocked,
  aroundLevel,
  onSave,
  onCancel,
}) {
  const id = useId();
  const [text, setText] = useState(initial.text);
  const [url, setUrl] = useState(initial.url);
  const [level, setLevel] = useState(initial.level);
  // Fields the site owner has left at least once; only their messages are shown.
  const [touched, setTouched] = useState({});

  const errors = validateParagraphLink({ linkText: text, url });
  const isValid = Object.keys(errors).length === 0;
  const isChanged =
    text.trim() !== initial.text ||
    url.trim() !== initial.url ||
    level !== initial.level;
  const canSave = isValid && (mode === "add" || isChanged);

  function touch(field) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  function handleSave() {
    if (!canSave) return;
    onSave({
      text: text.trim(),
      url: url.trim(),
      level: aroundLevel ? 0 : level,
    });
  }

  return (
    <div
      className={`${styles.linkDraft} ${mode === "edit" ? styles.linkEdit : ""}`}
    >
      <label htmlFor={`${id}-text`}>Link text</label>
      <input
        id={`${id}-text`}
        type="text"
        maxLength={100}
        readOnly={textLocked}
        autoFocus={!textLocked}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => touch("linkText")}
        className={styles.input}
      />
      {touched.linkText && errors.linkText && (
        <p className="fieldError">{errors.linkText}</p>
      )}

      <label htmlFor={`${id}-url`}>Link URL</label>
      <input
        id={`${id}-url`}
        type="url"
        placeholder="https://"
        autoFocus={textLocked}
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onBlur={() => touch("url")}
        className={styles.input}
      />
      {touched.url && errors.url && <p className="fieldError">{errors.url}</p>}

      <div className={styles.formatButtons}>
        <button
          type="button"
          aria-label="Bold link"
          aria-pressed={Boolean((level | aroundLevel) & BOLD)}
          title="Bold link"
          disabled={Boolean(aroundLevel)}
          onClick={() => setLevel((current) => current ^ BOLD)}
          className={styles.formatButton}
        >
          <MdFormatBold aria-hidden="true" />
        </button>
      </div>
      {aroundLevel > 0 && (
        <p className={styles.message}>
          <i>{AROUND_NOTES[aroundLevel]}</i>
        </p>
      )}

      <div className={styles.linkDraftButtons}>
        <button type="button" disabled={!canSave} onClick={handleSave}>
          {mode === "edit" ? "Update link" : "Add link"}
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
