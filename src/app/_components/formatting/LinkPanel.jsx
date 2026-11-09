// LinkPanel (site owner): the panel for adding a link to a paragraph, or editing one from its
// links list: Link text, Link URL and a Bold toggle. onSave gets { text, url, level }, trimmed.

"use client";

import { useId, useState } from "react";
import { MdFormatBold } from "react-icons/md";
import { validateParagraphLink } from "../../_lib/validation";

import styles from "../../_styling/postForm.module.css";

// The bold bit of a link's level (its marker length: 2 bold, 1 italic, 3 both).
const BOLD = 2;

const AROUND_NOTES = {
  1: "Italic from the words around it.",
  2: "Bold from the words around it.",
  3: "Bold and italic from the words around it.",
};

// textLocked: the link text came from highlighted words, so the site owner sees exactly which
// words become the link. aroundLevel: the bold / italic of a larger run the link sits in; the link
// takes that look on and can't have one of its own (formats don't nest), so Bold is disabled.
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
  // An unchanged link isn't rewritten.
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
        {/* Flips only the bold bit, so a hand-typed italic link keeps its italic. */}
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

      {/* Cancel on the left, the action on the right, as in every dialog. */}
      <div className={styles.linkDraftButtons}>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" disabled={!canSave} onClick={handleSave}>
          {mode === "edit" ? "Update link" : "Add link"}
        </button>
      </div>
    </div>
  );
}
