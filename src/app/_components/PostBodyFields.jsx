// PostBodyFields: the post body editor shared by Create and Edit a Post. The body is an ordered
// list of elements, each a paragraph or an image; the site owner adds, moves, and deletes them.
// Handles validation, the limits (5 paragraphs, 5 images), the one-paragraph rule, the
// "complete it before adding another" rule and image width/height auto-fill. Each paragraph is a
// ParagraphField (its format buttons, Link panel and links list). An incomplete element's note
// (including "One paragraph is required…" under a blank paragraph) shows inside that element's
// section, under its buttons; the limits, and the required message once every paragraph is
// deleted, show inside the Add buttons' section, above them.
//
// Controlled by the parent form, which owns the body array and passes its React state setter
// (setBody) so every change is a functional update. That matters for auto-fill: an image load
// finishes later, and must patch the element as it is *then*, not as it was when the URL was
// typed. Elements are held flat ({ key, type: "paragraph", text } or
// { key, type: "image", id?, src, width, height, altText }); the client-only `key` is for React
// lists and is stripped before sending, and images loaded for Edit keep their real `id`.
// fieldErrors is the API's error.fields, keyed by full path ("body.2.image.src").

"use client";

import ItemFields, { serverErrorsFor } from "./ItemFields";
import ParagraphField from "./ParagraphField";
import {
  isBlank,
  isHttpsUrl,
  validateBody,
  validateImage,
  validateParagraph,
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
