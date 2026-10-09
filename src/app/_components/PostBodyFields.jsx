// PostBodyFields: the post body editor shared by Create and Edit a Post. The body is an ordered
// list of elements, each a paragraph or an image; the site owner adds, moves, and deletes them.
// Handles validation, the limits (5 paragraphs, 5 images), the one-paragraph rule, the
// "complete it before adding another" rule and image width/height auto-fill. The messages that
// explain a disabled Add button (and a disabled Submit) show after the last element.
//
// Controlled by the parent form, which owns the body array and passes its React state setter
// (setBody) so every change is a functional update. That matters for auto-fill: an image load
// finishes later, and must patch the element as it is *then*, not as it was when the URL was
// typed. Elements are held flat ({ key, type: "paragraph", text } or
// { key, type: "image", id?, src, width, height, altText }); the client-only `key` is for React
// lists and is stripped before sending, and images loaded for Edit keep their real `id`.
// fieldErrors is the API's error.fields, keyed by full path ("body.2.image.src").

"use client";

import { useId, useState } from "react";
import ItemFields, { serverErrorsFor } from "./ItemFields";
import {
  isHttpsUrl,
  validateBody,
  validateImage,
  validateParagraph,
} from "../_lib/validation";

const MAX_PARAGRAPHS = 5;
const MAX_IMAGES = 5;

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

// The textarea for one paragraph. Its message shows once it has been left; otherwise the
// server's message shows.
function ParagraphField({ value, onChange, serverError }) {
  const id = useId();
  const [touched, setTouched] = useState(false);
  const error = validateParagraph(value).text;
  const message = touched && error ? error : serverError;

  return (
    <>
      <label htmlFor={id}>Paragraph</label>
      <p>Line breaks you add will show on your website.</p>
      <textarea
        id={id}
        maxLength={10000}
        value={value.text}
        onChange={(e) => onChange({ text: e.target.value })}
        onBlur={() => setTouched(true)}
      />
      {message && <p>{message}</p>}
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
  // Shown after the last element. The paragraph note is left out while paragraphRequired
  // already says the same thing.
  const notes = [
    paragraphRequired,
    !paragraphRequired &&
      paragraphIncomplete &&
      "Complete or delete paragraph to submit.",
    imageIncomplete && "Complete or delete image to submit.",
    paragraphsFull && `Maximum of ${MAX_PARAGRAPHS} paragraphs`,
    imagesFull && `Maximum of ${MAX_IMAGES} images`,
  ].filter(Boolean);

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
    <fieldset>
      <legend>Body</legend>
      {fieldErrors.body && <p>{fieldErrors.body}</p>}

      {body.map((element, index) => (
        <div key={element.key}>
          {element.type === "paragraph" ? (
            <ParagraphField
              value={element}
              onChange={(changes) => patchElement(element, changes)}
              serverError={fieldErrors[`body.${index}.text`]}
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
          <button
            type="button"
            aria-label={`Move ${elementNames[index]} up`}
            disabled={index === 0}
            onClick={() => moveElement(index, -1)}
          >
            Move up
          </button>
          <button
            type="button"
            aria-label={`Move ${elementNames[index]} down`}
            disabled={index === body.length - 1}
            onClick={() => moveElement(index, 1)}
          >
            Move down
          </button>
          <button
            type="button"
            aria-label={`Delete ${elementNames[index]}`}
            onClick={() => deleteElement(element.key)}
          >
            Delete
          </button>
        </div>
      ))}

      {notes.map((note) => (
        <p key={note}>{note}</p>
      ))}
      <button
        type="button"
        disabled={paragraphsFull || paragraphIncomplete}
        onClick={() => addElement(EMPTY_PARAGRAPH)}
      >
        Add paragraph
      </button>
      <button
        type="button"
        disabled={imagesFull || Boolean(paragraphRequired) || imageIncomplete}
        onClick={() => addElement(EMPTY_IMAGE)}
      >
        Add image
      </button>
    </fieldset>
  );
}
