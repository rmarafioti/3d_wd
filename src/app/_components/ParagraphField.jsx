// ParagraphField (site owner): one paragraph of the post body in PostBodyFields: its format
// buttons, the textarea, the Link panel, and the list of the paragraph's links
// (docs/flows.md → Paragraph formatting).
// The format buttons work like a text editor's:
// - with words highlighted, Bold / Italic switch their bit of the run around them: **a** with
//   Italic becomes ***a***, then Bold off leaves *a*, and with no bit left the markers go;
// - with only the cursor, Bold / Italic put an empty pair of markers there with the cursor
//   between them, so what is typed next is formatted. With the cursor in a run's words (or an
//   empty pair), they switch their bit for the whole run: Bold then Italic gives ******, and
//   Bold in ***words*** leaves *words*. With the cursor in a run's markers, or just outside them,
//   a click moves it back into the words. A new pair is only made away from any run;
// - Link opens the Link panel to add a link, showing the highlighted words as its text (or a
//   Link text field to type into). New links are bold by default.
// Ctrl / Cmd + B, I and K press them from the keyboard.
// Links are managed from the list under the textarea (a disclosure, closed to start with), not
// inside the text: each one's Edit opens the Link panel filled in (its text, URL and bold) and
// closes it again, and Delete removes the link but keeps its words, then closes the list.
// Bold, on or off in its panel, is the only look a link takes: the toolbar never formats a link,
// so while the cursor is inside one, or a highlight covers any part of one, all three buttons
// are disabled. The list is read from the text on every render, so it always matches what is
// typed, links typed by hand included.
// The text's own message (a bad link, too long) shows as soon as it applies, since the buttons
// change the text without leaving the field; "Paragraph is required." shows once it has been
// left, otherwise the server's message shows. requiredNoted: "One paragraph is required to submit
// a post." already shows under this paragraph, so "Paragraph is required." would repeat it and is
// hidden.

"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import {
  MdDelete,
  MdEdit,
  MdFormatBold,
  MdFormatItalic,
  MdLink,
} from "react-icons/md";
import LinkPanel from "./LinkPanel";
import {
  formatRunAround,
  formatsAtCaret,
  linkMarkup,
  linksInParagraph,
} from "../_lib/postFormatting";
import {
  isBlank,
  validateParagraph,
  validateParagraphLink,
} from "../_lib/validation";

import styles from "../_styling/postForm.module.css";

// The format buttons, in order, each with its icon and Ctrl / Cmd shortcut key. Bold and Italic
// are bits of a format's level, its marker length: Bold is 2 (**), Italic is 1 (*), both
// together 3 (***). Link opens the Link panel.
const FORMAT_BUTTONS = [
  { type: "bold", label: "Bold", bit: 2, Icon: MdFormatBold, key: "b" },
  { type: "italic", label: "Italic", bit: 1, Icon: MdFormatItalic, key: "i" },
  { type: "link", label: "Link", Icon: MdLink, key: "k" },
];

function markersOf(level) {
  return "*".repeat(level);
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

// What the selection or cursor is already in: { level, run }. level is the run's (0 when there
// is none), so Bold is on when it has the 2 bit and Italic when it has the 1 bit.
function formatStateAt(text, { start, end }) {
  if (start === end) {
    // Just outside a run (run.edge), typing is plain, so its buttons aren't on there.
    const { run } = formatsAtCaret(text, start);
    return { level: run && !run.edge ? run.level : 0, run };
  }
  const run = formatRunAround(text, start, end);
  return { level: run?.level ?? 0, run };
}

// Whether the selection or cursor touches a link: the cursor inside its markup (its own bold
// markers included), or a highlight over any part of it. The toolbar never formats a link; its
// look is set in its Link panel.
function touchesLink(links, { start, end }) {
  return links.some(({ ownOuterStart, ownOuterEnd }) => {
    if (start === end) return ownOuterStart < start && start < ownOuterEnd;
    return start < ownOuterEnd && end > ownOuterStart;
  });
}

export default function ParagraphField({
  name,
  value,
  onChange,
  serverError,
  requiredNoted,
}) {
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
  // The open Link panel, or null: { mode: "add", start, end, text, textLocked, aroundLevel } to
  // add a link at a selection, or { mode: "edit", index } to edit one from the links list.
  const [linkPanel, setLinkPanel] = useState(null);
  // Whether the links list disclosure is open. Closed to start with, and again after a delete.
  const [linksOpen, setLinksOpen] = useState(false);

  const error = validateParagraph(value).text;
  const repeatsNote = requiredNoted && isBlank(value.text);
  const showError = touched || !isBlank(value.text);
  const message = showError && error && !repeatsNote ? error : serverError;
  const links = linksInParagraph(value.text);
  const formatState = selection && formatStateAt(value.text, selection);
  const buttonsDisabled = !selection || touchesLink(links, selection);

  // After a button changes the text, focus returns to the textarea with the new selection. It
  // follows restoreCount, not the text: moving the cursor back into a run leaves the text as it
  // was and only moves the cursor.
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

  // Typing closes the Link panel, so the place it would write to is never stale. The selection
  // is read from the change itself: otherwise, for one render, the cursor from before a deleted
  // letter could sit between two closing markers and read as an empty italic.
  function handleTextChange(event) {
    setLinkPanel(null);
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
    setLinkPanel(null);
    onChange({ text: text.slice(0, start) + replacement + text.slice(end) });
  }

  // Bold or Italic with words highlighted: switch the button's bit of the run around them,
  // keeping the words selected.
  function toggleOnWords({ run }, bit, { start, end }) {
    if (!run) {
      const words = value.text.slice(start, end);
      const marker = markersOf(bit);
      replaceText(start, end, marker + words + marker, start + bit, end + bit);
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

  // Bold or Italic with only the cursor (see the comment at the top). With the cursor touching a
  // run, the click always acts on that run, never adds new markers beside it.
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

  // Link: closes the Add panel if it is open, otherwise opens it at the selection. A link added
  // inside bold or italic words takes that look on (aroundLevel).
  function handleLinkClick({ start, end }) {
    if (linkPanel?.mode === "add") {
      setLinkPanel(null);
      return;
    }
    const { level } = formatStateAt(value.text, { start, end: start });
    setLinkPanel({
      mode: "add",
      start,
      end,
      text: value.text.slice(start, end),
      textLocked: start !== end,
      aroundLevel: level,
    });
  }

  // A format button or its shortcut.
  function handleFormatClick(button) {
    const current = currentSelection();
    if (!current || touchesLink(links, current)) return;
    if (button.type === "link") {
      handleLinkClick(current);
      return;
    }
    const state = formatStateAt(value.text, current);
    if (current.start === current.end) {
      toggleAtCaret(state, button.bit, current.start);
    } else {
      toggleOnWords(state, button.bit, current);
    }
  }

  function addLink(link) {
    const { start, end } = linkPanel;
    const markup = linkMarkup(link);
    replaceText(
      start,
      end,
      markup,
      start + markup.length,
      start + markup.length,
    );
  }

  // Rewrites one link, together with its own bold / italic markers.
  function updateLink(index, link) {
    const { ownOuterStart, ownOuterEnd } = links[index];
    const markup = linkMarkup(link);
    const after = ownOuterStart + markup.length;
    replaceText(ownOuterStart, ownOuterEnd, markup, after, after);
  }

  // Edit on a link's row opens its panel, or closes it if it is that row's panel already open.
  function toggleEdit(index) {
    const isOpen = linkPanel?.mode === "edit" && linkPanel.index === index;
    setLinkPanel(isOpen ? null : { mode: "edit", index });
  }

  // Removes a link but keeps its words, and any bold / italic of its own around them. The list
  // closes again afterwards.
  function deleteLink(index) {
    setLinksOpen(false);
    const { outerStart, outerEnd, text } = links[index];
    replaceText(
      outerStart,
      outerEnd,
      text,
      outerStart,
      outerStart + text.length,
    );
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
              // Pressed while the cursor or highlighted words have this format, and Link while
              // its Add panel is open.
              aria-pressed={
                type === "link"
                  ? linkPanel?.mode === "add"
                  : Boolean(formatState && formatState.level & button.bit)
              }
              title={`${label} (Ctrl+${key.toUpperCase()} or ⌘${key.toUpperCase()})`}
              disabled={buttonsDisabled}
              onClick={() => handleFormatClick(button)}
              className={styles.formatButton}
            >
              <Icon aria-hidden="true" />
            </button>
          );
        })}
      </div>
      {linkPanel?.mode === "add" && (
        <LinkPanel
          mode="add"
          // Links are bold by default.
          initial={{ text: linkPanel.text, url: "", level: 2 }}
          textLocked={linkPanel.textLocked}
          aroundLevel={linkPanel.aroundLevel}
          onSave={addLink}
          onCancel={() => setLinkPanel(null)}
        />
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

      {links.length > 0 && (
        // A disclosure, closed to start with, so the links stay out of the way until wanted.
        <details
          open={linksOpen}
          onToggle={(event) => setLinksOpen(event.currentTarget.open)}
          className={styles.linksList}
        >
          <summary className={styles.linksHeader}>
            Links in this paragraph
          </summary>
          <ul>
            {links.map((link, index) => {
              const linkError = Object.values(
                validateParagraphLink({ linkText: link.text, url: link.url }),
              )[0];
              return (
                <li key={link.outerStart} className={styles.linkRow}>
                  {/* The link on the left, its edit and delete icons on the right. */}
                  <div className={styles.linkSummary}>
                    <div className={styles.linkDetails}>
                      <p>{link.text}</p>
                      <p className={styles.message}>{link.url}</p>
                    </div>
                    <div className={styles.linkActions}>
                      <button
                        type="button"
                        aria-label={`Edit link ${index + 1} in ${name}`}
                        title="Edit link"
                        // Pressed while this link's panel is open; a click then closes it.
                        aria-pressed={
                          linkPanel?.mode === "edit" &&
                          linkPanel.index === index
                        }
                        onClick={() => toggleEdit(index)}
                        className={styles.formatButton}
                      >
                        <MdEdit aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete link ${index + 1} in ${name}`}
                        title="Delete link"
                        onClick={() => deleteLink(index)}
                        className={styles.formatButton}
                      >
                        <MdDelete aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  {linkError && <p className="fieldError">{linkError}</p>}
                  {linkPanel?.mode === "edit" && linkPanel.index === index && (
                    <LinkPanel
                      mode="edit"
                      initial={{
                        text: link.text,
                        url: link.url,
                        level: link.ownLevel,
                      }}
                      textLocked={false}
                      aroundLevel={link.aroundLevel}
                      onSave={(updated) => updateLink(index, updated)}
                      onCancel={() => setLinkPanel(null)}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </>
  );
}
