// PostBodyFields: the post body editor shared by Create and Edit a Post. The body is an ordered
// list of elements, each a paragraph or an image; the site owner adds, moves, and deletes them.
// Handles validation, the limits (5 paragraphs, 5 images), the one-paragraph rule, the
// "complete it before adding another" rule, each paragraph's Bold / Italic / Link buttons and
// image width/height auto-fill. An incomplete element's note (including "One paragraph is required…" under a blank paragraph) shows inside
// that element's section, under its buttons; the limits, and the required message once every
// paragraph is deleted, show inside the Add buttons' section, above them.
//
// Controlled by the parent form, which owns the body array and passes its React state setter
// (setBody) so every change is a functional update. That matters for auto-fill: an image load
// finishes later, and must patch the element as it is *then*, not as it was when the URL was
// typed. Elements are held flat ({ key, type: "paragraph", text } or
// { key, type: "image", id?, src, width, height, altText }); the client-only `key` is for React
// lists and is stripped before sending, and images loaded for Edit keep their real `id`.
// fieldErrors is the API's error.fields, keyed by full path ("body.2.image.src").

"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { MdFormatBold, MdFormatItalic, MdLink } from "react-icons/md";
import ItemFields, { serverErrorsFor } from "./ItemFields";
import {
  formatRunAround,
  formatsAtCaret,
  linkAround,
} from "../_lib/postFormatting";
import {
  isBlank,
  isHttpsUrl,
  validateBody,
  validateImage,
  validateParagraph,
  validateParagraphLink,
} from "../_lib/validation";

import styles from "../_styling/postForm.module.css";

const MAX_PARAGRAPHS = 5;
const MAX_IMAGES = 5;

// The note under an incomplete element, which also explains the disabled Add button and Submit.
const INCOMPLETE_NOTES = {
  paragraph: "Complete or delete paragraph to submit.",
  image: "Complete or delete image to submit.",
};

export const EMPTY_PARAGRAPH = { type: "paragraph", text: "" };
const EMPTY_IMAGE = {
  type: "image",
  src: "",
  width: "",
  height: "",
  altText: "",
};

// A paragraph's format buttons, in order, each with its icon and Ctrl / Cmd shortcut key. Bold
// and Italic are bits of a format's level, its marker length: Bold is 2 (**), Italic is 1 (*),
// both together 3 (***). Link opens the Link panel.
const FORMAT_BUTTONS = [
  { type: "bold", label: "Bold", bit: 2, Icon: MdFormatBold, key: "b" },
  { type: "italic", label: "Italic", bit: 1, Icon: MdFormatItalic, key: "i" },
  { type: "link", label: "Link", Icon: MdLink, key: "k" },
];

function markersOf(level) {
  return "*".repeat(level);
}

// The inputs for an image element, in display order (see ItemFields).
const IMAGE_FIELDS = [
  { name: "src", label: "Image URL", type: "url" },
  {
    name: "width",
    label: "Width",
    type: "number",
    min: 1,
    max: 10000,
    step: 1,
  },
  {
    name: "height",
    label: "Height",
    type: "number",
    min: 1,
    max: 10000,
    step: 1,
  },
  { name: "altText", label: "Alt Text", type: "text", maxLength: 200 },
];

// Loads the image in the background and reports its natural size. If it fails to load,
// nothing is reported and Width / Height stay as they are for manual entry.
function loadDimensions(src, onLoad) {
  if (!isHttpsUrl(src)) return;
  const image = new Image();
  image.onload = () => onLoad(image.naturalWidth, image.naturalHeight);
  image.src = src.trim();
}

// Image auto-fill. `apply` updates this same element with a functional update, so the size is
// only filled in if the URL is still the one that was loaded.
function autoFillDimensions(patch, apply) {
  if (patch.src === undefined) return;
  loadDimensions(patch.src, (width, height) =>
    apply((image) =>
      image.src === patch.src
        ? { ...image, width: String(width), height: String(height) }
        : image,
    ),
  );
}

// Whether an element fails its own validation (a blank paragraph, an unfinished image).
export function isIncompleteElement(element) {
  const validate =
    element.type === "paragraph" ? validateParagraph : validateImage;
  return Object.keys(validate(element)).length > 0;
}

// The part of a textarea's selection the format buttons act on, as { start, end }: the
// highlighted words with spaces at either end left outside (bold and italic don't apply to words
// that start or end with a space), or start === end for the cursor alone. A highlight of only
// spaces counts as the cursor at its end. Null when the highlight runs over a line break, since
// formatting never crosses one.
function formatSelection(textarea) {
  const { selectionStart, selectionEnd, value } = textarea;
  const selected = value.slice(selectionStart, selectionEnd);
  const trimmed = selected.trim();
  if (trimmed === "") return { start: selectionEnd, end: selectionEnd };
  if (trimmed.includes("\n")) return null;
  const start =
    selectionStart + (selected.length - selected.trimStart().length);
  return { start, end: start + trimmed.length };
}

// What the selection or cursor is already in: { level, run, link, target }. With words
// highlighted, the target is those words, or the whole link when they are a link's text, so Bold
// and Italic act around the link. level is the run's (0 when there is none), so Bold is on when it
// has the 2 bit and Italic when it has the 1 bit.
function formatStateAt(text, { start, end }) {
  if (start === end) {
    // Just outside a run (run.edge), typing is plain, so its buttons aren't on there.
    const { run, link } = formatsAtCaret(text, start);
    const level = run && !run.edge ? run.level : 0;
    return { level, run, link, target: { start, end } };
  }
  const link = linkAround(text, start, end);
  const target = link
    ? { start: link.outerStart, end: link.outerEnd }
    : { start, end };
  const run = formatRunAround(text, target.start, target.end);
  return { level: run?.level ?? 0, run, link, target };
}

// One paragraph: its format buttons, the Link panel while a link is being added, and the
// textarea. The buttons work like a text editor's (docs/flows.md → Paragraph formatting):
// - with words highlighted, Bold / Italic switch their bit of the run around them: **a** with
//   Italic becomes ***a***, then Bold off leaves *a*, and with no bit left the markers go;
// - with only the cursor, Bold / Italic put an empty pair of markers there with the cursor
//   between them, so what is typed next is formatted. With the cursor in a run's words (or an
//   empty pair), they switch their bit for the whole run: Bold then Italic gives ******, and
//   Bold in ***words*** leaves *words*. With the cursor in a run's markers, or just outside them,
//   a click moves it back into the words. A new pair is only made away from any run;
// - Link removes the link the words or cursor are in; otherwise it opens a panel for the URL,
//   showing the highlighted words as the link text (or a Link text field to type into). A link
//   may sit inside bold or italic.
// Ctrl / Cmd + B, I and K press them from the keyboard.
// The text's own message (a bad link, too long) shows as soon as it applies, since the buttons
// change the text without leaving the field; "Paragraph is required." shows once it has been
// left, otherwise the server's message shows. requiredNoted: "One paragraph is required to submit
// a post." already shows under this paragraph, so "Paragraph is required." would repeat it and is
// hidden.
function ParagraphField({ name, value, onChange, serverError, requiredNoted }) {
  const id = useId();
  const textareaRef = useRef(null);
  // Until the site owner first clicks into the paragraph, the buttons act at the end of its text.
  const hasFocused = useRef(false);
  // The selection to restore once the text a button changed has rendered, and a count that
  // each button change bumps so the restore runs even when the text itself didn't change.
  const pendingSelection = useRef(null);
  const [restoreCount, setRestoreCount] = useState(0);
  const [touched, setTouched] = useState(false);
  // The selection the buttons act on (see formatSelection), or null (they are disabled).
  const [selection, setSelection] = useState(() => ({
    start: value.text.length,
    end: value.text.length,
  }));
  // While the Link panel is open: where the link goes, its text (locked when it came from
  // highlighted words), the URL typed, and whether "Add link" was tried. Null otherwise.
  const [linkDraft, setLinkDraft] = useState(null);

  const error = validateParagraph(value).text;
  const repeatsNote = requiredNoted && isBlank(value.text);
  const showError = touched || !isBlank(value.text);
  const message = showError && error && !repeatsNote ? error : serverError;
  const formatState = selection && formatStateAt(value.text, selection);
  const linkErrors = linkDraft?.tried ? validateParagraphLink(linkDraft) : {};

  // After a button changes the text, focus returns to the textarea with the new selection. It
  // follows restoreCount, not the text: ending bold that has no stray spaces leaves the text as
  // it was and only moves the cursor.
  useLayoutEffect(() => {
    if (!pendingSelection.current) return;
    const { start, end } = pendingSelection.current;
    pendingSelection.current = null;
    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(start, end);
    setSelection(formatSelection(textareaRef.current));
  }, [restoreCount]);

  // The selection as it is now, read at the moment a button or shortcut acts, in case it moved
  // without an event the state saw.
  function currentSelection() {
    if (!hasFocused.current) {
      return { start: value.text.length, end: value.text.length };
    }
    return formatSelection(textareaRef.current);
  }

  function handleSelectionChange() {
    setSelection(formatSelection(textareaRef.current));
  }

  // Typing closes the Link panel, so the place it would insert at is never stale. The selection
  // is read from the change itself: otherwise, for one render, the cursor from before a deleted
  // letter could sit between two closing markers and read as an empty italic.
  function handleTextChange(event) {
    setLinkDraft(null);
    setSelection(formatSelection(event.target));
    onChange({ text: event.target.value });
  }

  // Ctrl / Cmd + B, I or K presses that format's button.
  function handleKeyDown(event) {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    const button = FORMAT_BUTTONS.find(
      (format) => format.key === event.key.toLowerCase(),
    );
    if (!button) return;
    event.preventDefault();
    handleFormatClick(button);
  }

  // Replaces text[start, end) with `replacement`, then selects [selectStart, selectEnd). Any
  // change to the text closes the Link panel, as typing does.
  function replaceText(start, end, replacement, selectStart, selectEnd) {
    const { text } = value;
    pendingSelection.current = { start: selectStart, end: selectEnd };
    setRestoreCount((count) => count + 1);
    setLinkDraft(null);
    onChange({ text: text.slice(0, start) + replacement + text.slice(end) });
  }

  // Removes a format's markup, keeping its words selected.
  function unwrap({ outerStart, outerEnd, innerStart, innerEnd }) {
    const words = value.text.slice(innerStart, innerEnd);
    replaceText(
      outerStart,
      outerEnd,
      words,
      outerStart,
      outerStart + words.length,
    );
  }

  // Bold or Italic with words highlighted: switch the button's bit of the run around the target,
  // keeping the words selected.
  function toggleOnWords({ run, target }, bit) {
    if (!run) {
      const words = value.text.slice(target.start, target.end);
      const marker = markersOf(bit);
      replaceText(
        target.start,
        target.end,
        marker + words + marker,
        target.start + bit,
        target.end + bit,
      );
      return;
    }
    const level = run.level ^ bit;
    const words = value.text.slice(run.innerStart, run.innerEnd);
    const marker = markersOf(level);
    replaceText(
      run.outerStart,
      run.outerEnd,
      marker + words + marker,
      run.outerStart + level,
      run.outerStart + level + words.length,
    );
  }

  // Bold or Italic with only the cursor (see the comment above ParagraphField). With the cursor
  // touching a run, the click always acts on that run, never adds new markers beside it.
  function toggleAtCaret({ run }, bit, caret) {
    if (!run) {
      // Against stars that aren't a run the editor recognises (** word**|), adding more would
      // only pile them up; new markers start once a space or letter separates the cursor.
      if (value.text[caret - 1] === "*" || value.text[caret] === "*") return;
      const marker = markersOf(bit);
      replaceText(caret, caret, marker + marker, caret + bit, caret + bit);
      return;
    }
    // In the markers, or just outside them: back into the words, with nothing changed.
    if (caret < run.innerStart || caret > run.innerEnd) {
      const inside = caret > run.innerEnd ? run.innerEnd : run.innerStart;
      replaceText(caret, caret, "", inside, inside);
      return;
    }
    // In the words (or an empty pair): switch this button's bit for the whole run. With no bit
    // left the markers go. The cursor keeps its place in the words.
    const level = run.level ^ bit;
    const words = value.text.slice(run.innerStart, run.innerEnd);
    const marker = markersOf(level);
    const moved = run.outerStart + level + (caret - run.innerStart);
    replaceText(
      run.outerStart,
      run.outerEnd,
      marker + words + marker,
      moved,
      moved,
    );
  }

  // Link: closes its panel if open, removes the link the words or cursor are in, or opens the
  // panel to add one.
  function handleLinkClick(current) {
    if (linkDraft) {
      setLinkDraft(null);
      return;
    }
    const { link } = formatStateAt(value.text, current);
    if (link) {
      unwrap(link);
      return;
    }
    const { start, end } = current;
    setLinkDraft({
      start,
      end,
      linkText: value.text.slice(start, end),
      locked: start !== end,
      url: "",
      tried: false,
    });
  }

  // A format button or its shortcut.
  function handleFormatClick({ type, bit }) {
    const current = currentSelection();
    if (!current) return;
    if (type === "link") {
      handleLinkClick(current);
      return;
    }
    const state = formatStateAt(value.text, current);
    if (current.start === current.end) toggleAtCaret(state, bit, current.start);
    else toggleOnWords(state, bit);
  }

  function addLink() {
    setLinkDraft((draft) => ({ ...draft, tried: true }));
    if (Object.keys(validateParagraphLink(linkDraft)).length > 0) return;
    const { start, end } = linkDraft;
    const link = `[${linkDraft.linkText.trim()}](${linkDraft.url.trim()})`;
    replaceText(start, end, link, start + link.length, start + link.length);
  }

  return (
    <>
      <label htmlFor={id}>Paragraph</label>
      <p className={styles.message}>
        <i>*Line breaks you add will show on your website.</i>
      </p>
      <div className={styles.formatButtons}>
        {FORMAT_BUTTONS.map((button) => {
          const { type, label, Icon, key } = button;
          return (
            <button
              key={type}
              type="button"
              aria-label={`${label} text in ${name}`}
              aria-keyshortcuts={`Control+${key.toUpperCase()} Meta+${key.toUpperCase()}`}
              // Pressed while the cursor or highlighted words have this format, and Link also
              // while its panel is open.
              aria-pressed={
                type === "link"
                  ? Boolean(formatState?.link || linkDraft)
                  : Boolean(formatState && formatState.level & button.bit)
              }
              title={`${label} (Ctrl+${key.toUpperCase()} or ⌘${key.toUpperCase()})`}
              // Every combination is allowed, so only a highlight over a line break disables them.
              disabled={!selection}
              onClick={() => handleFormatClick(button)}
              className={styles.formatButton}
            >
              <Icon aria-hidden="true" />
            </button>
          );
        })}
      </div>
      {linkDraft && (
        <div className={styles.linkDraft}>
          <label htmlFor={`${id}-link-text`}>Link text</label>
          <input
            id={`${id}-link-text`}
            type="text"
            maxLength={100}
            readOnly={linkDraft.locked}
            autoFocus={!linkDraft.locked}
            value={linkDraft.linkText}
            onChange={(e) =>
              setLinkDraft((draft) => ({ ...draft, linkText: e.target.value }))
            }
            className={styles.input}
          />
          {linkErrors.linkText && (
            <p className="fieldError">{linkErrors.linkText}</p>
          )}
          <label htmlFor={`${id}-link-url`}>Link URL</label>
          <input
            id={`${id}-link-url`}
            type="url"
            placeholder="https://"
            autoFocus={linkDraft.locked}
            value={linkDraft.url}
            onChange={(e) =>
              setLinkDraft((draft) => ({ ...draft, url: e.target.value }))
            }
            className={styles.input}
          />
          {linkErrors.url && <p className="fieldError">{linkErrors.url}</p>}
          <div className={styles.linkDraftButtons}>
            <button type="button" onClick={addLink}>
              Add link
            </button>
            <button type="button" onClick={() => setLinkDraft(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      <textarea
        ref={textareaRef}
        id={id}
        maxLength={10000}
        value={value.text}
        onChange={handleTextChange}
        onFocus={() => {
          hasFocused.current = true;
        }}
        onSelect={handleSelectionChange}
        onKeyUp={handleSelectionChange}
        onMouseUp={handleSelectionChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTouched(true)}
      />
      {message && <p className="fieldError">{message}</p>}
    </>
  );
}

export default function PostBodyFields({
  body,
  setBody,
  fieldErrors,
  onReindex,
}) {
  const paragraphCount = body.filter(
    (element) => element.type === "paragraph",
  ).length;
  const imageCount = body.length - paragraphCount;
  const paragraphsFull = paragraphCount >= MAX_PARAGRAPHS;
  const imagesFull = imageCount >= MAX_IMAGES;
  // Set while no paragraph has text; images can't be added until one does.
  const paragraphRequired = validateBody(body).body;
  // A new element of a type can't be added while one of that type is still incomplete.
  const paragraphIncomplete = body.some(
    (element) => element.type === "paragraph" && isIncompleteElement(element),
  );
  const imageIncomplete = body.some(
    (element) => element.type === "image" && isIncompleteElement(element),
  );
  // While no paragraph has text the Add buttons are hidden, not disabled: the note under the blank
  // paragraph says what to do. Add paragraph still shows when there is no paragraph at all, as
  // it is then the only way to add one.
  const showAddParagraph = !paragraphRequired || paragraphCount === 0;
  const showAddImage = !paragraphRequired;

  // Notes for the whole body, shown above the Add buttons. The required message only shows here
  // when there is no paragraph to show it under (every paragraph was deleted).
  const notes = [
    paragraphCount === 0 && paragraphRequired,
    paragraphsFull && `Maximum of ${MAX_PARAGRAPHS} paragraphs`,
    imagesFull && `Maximum of ${MAX_IMAGES} images`,
  ].filter(Boolean);

  // An element's own note, shown under its buttons. While no paragraph has text, a blank
  // paragraph shows the required message instead of "Complete or delete paragraph". A paragraph
  // with text that fails (a bad link, too long) has no note: its own message says what's wrong.
  function incompleteNoteFor(element) {
    if (!isIncompleteElement(element)) return null;
    if (element.type === "image") return INCOMPLETE_NOTES.image;
    if (!isBlank(element.text)) return null;
    if (paragraphRequired) return paragraphRequired;
    return INCOMPLETE_NOTES.paragraph;
  }

  // Each element's name for screen readers, counted within its type ("paragraph 2", "image 1"),
  // so its Move up / Move down / Delete buttons can be told apart.
  const typeCounts = { paragraph: 0, image: 0 };
  const elementNames = body.map(
    (element) => `${element.type} ${++typeCounts[element.type]}`,
  );

  // Returns a function that applies a functional update to one element.
  function applyToElement(key) {
    return (update) =>
      setBody((list) =>
        list.map((element) =>
          element.key === key ? update(element) : element,
        ),
      );
  }

  function patchElement(element, changes) {
    const apply = applyToElement(element.key);
    apply((current) => ({ ...current, ...changes }));
    if (element.type === "image") autoFillDimensions(changes, apply);
  }

  function addElement(emptyElement) {
    setBody((list) => [...list, { ...emptyElement, key: crypto.randomUUID() }]);
    onReindex();
  }

  // offset is -1 (up) or 1 (down); the buttons are disabled at the ends.
  function moveElement(index, offset) {
    setBody((list) => {
      const next = [...list];
      const [element] = next.splice(index, 1);
      next.splice(index + offset, 0, element);
      return next;
    });
    onReindex();
  }

  function deleteElement(key) {
    setBody((list) => list.filter((element) => element.key !== key));
    onReindex();
  }

  return (
    <fieldset className={styles.bodySection}>
      <legend className={styles.bodyHeader}>Body</legend>
      {fieldErrors.body && <p>{fieldErrors.body}</p>}

      {body.map((element, index) => (
        <div
          key={element.key}
          className={`${styles.bodyElement} ${styles.section}`}
        >
          {element.type === "paragraph" ? (
            <ParagraphField
              name={elementNames[index]}
              value={element}
              onChange={(changes) => patchElement(element, changes)}
              serverError={fieldErrors[`body.${index}.text`]}
              requiredNoted={Boolean(paragraphRequired)}
            />
          ) : (
            <ItemFields
              fields={IMAGE_FIELDS}
              validate={validateImage}
              value={element}
              onPatch={(changes) => patchElement(element, changes)}
              serverErrors={serverErrorsFor(
                fieldErrors,
                `body.${index}.image.`,
              )}
            />
          )}
          {fieldErrors[`body.${index}.type`] && (
            <p>{fieldErrors[`body.${index}.type`]}</p>
          )}
          <div className={styles.buttonRow}>
            <div className={styles.upDownButtons}>
              <button
                type="button"
                aria-label={`Move ${elementNames[index]} up`}
                disabled={index === 0}
                onClick={() => moveElement(index, -1)}
                className={styles.bodyButton}
              >
                Move up
              </button>
              <button
                type="button"
                aria-label={`Move ${elementNames[index]} down`}
                disabled={index === body.length - 1}
                onClick={() => moveElement(index, 1)}
                className={styles.bodyButton}
              >
                Move down
              </button>
            </div>
            <button
              type="button"
              aria-label={`Delete ${elementNames[index]}`}
              onClick={() => deleteElement(element.key)}
              className={styles.bodyButton}
            >
              Delete
            </button>
          </div>
          {incompleteNoteFor(element) && <p>{incompleteNoteFor(element)}</p>}
        </div>
      ))}

      {(showAddParagraph || notes.length > 0) && (
        <div className={styles.section}>
          {notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
          <div className={styles.buttonRow}>
            {showAddParagraph && (
              <button
                type="button"
                disabled={paragraphsFull || paragraphIncomplete}
                onClick={() => addElement(EMPTY_PARAGRAPH)}
                className={styles.addButton}
              >
                {paragraphCount === 0
                  ? "Add a paragraph"
                  : "Add another paragraph"}
              </button>
            )}
            {showAddImage && (
              <button
                type="button"
                disabled={imagesFull || imageIncomplete}
                onClick={() => addElement(EMPTY_IMAGE)}
                className={styles.addButton}
              >
                {imageCount === 0 ? "Add an image" : "Add another image"}
              </button>
            )}
          </div>
        </div>
      )}
    </fieldset>
  );
}
