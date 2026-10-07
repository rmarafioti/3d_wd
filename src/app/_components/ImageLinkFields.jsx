// ImageLinkFields: shared image/link "add another" fields for Create and Edit a Post.
// Handles add/remove, validation, limits (5 images, 10 links) and image width/height auto-fill.
//
// Controlled by the parent form, which owns the images and links arrays and passes their React
// state setters (setImages / setLinks) so every change is a functional update. That matters for
// auto-fill: an image load finishes later, and must patch the item as it is *then*, not as it
// was when the URL was typed. Each item has a client-only `key` for React lists (stripped before
// sending); items loaded for Edit also keep their real `id` so the backend can reconcile them.
//
// Images and links are the same list editor (ItemList) with different fields; images add one
// extra step, auto-fill. A new item starts as a draft held in ItemList; it joins the array only
// when its "Add" button validates it. fieldErrors is the API's error.fields, keyed by full path
// ("images.0.src").

"use client";

import { Fragment, useId, useState } from "react";
import { isHttpsUrl, validateImage, validateLink } from "../_lib/validation";

const MAX_IMAGES = 5;
const MAX_LINKS = 10;

const EMPTY_IMAGE = { src: "", width: "", height: "", altText: "" };
const EMPTY_LINK = { name: "", url: "" };

// The inputs for each kind of item, in display order. Every entry other than name and label is
// passed straight to the <input>.
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
const LINK_FIELDS = [
  { name: "name", label: "Link Name", type: "text", maxLength: 100 },
  { name: "url", label: "URL", type: "url" },
];

// Loads the image in the background and reports its natural size. If it fails to load,
// nothing is reported and Width / Height stay as they are for manual entry.
function loadDimensions(src, onLoad) {
  if (!isHttpsUrl(src)) return;
  const image = new Image();
  image.onload = () => onLoad(image.naturalWidth, image.naturalHeight);
  image.src = src.trim();
}

// Image auto-fill, ItemList's image-only extra step. `apply` updates this same item (saved or
// draft) with a functional update, so the size is only filled in if the URL is still the one
// that was loaded.
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

// Picks this item's server messages out of error.fields: "images.2.src" → { src: "..." }.
function serverErrorsFor(fieldErrors, listName, index) {
  const prefix = `${listName}.${index}.`;
  const errors = {};
  for (const [path, message] of Object.entries(fieldErrors)) {
    if (path.startsWith(prefix)) errors[path.slice(prefix.length)] = message;
  }
  return errors;
}

// The inputs for one item (a saved item or the draft). Messages show for a field once it has
// been left, or for every field when showAllErrors is set; otherwise the server's message shows.
function ItemFields({
  fields,
  validate,
  value,
  onPatch,
  serverErrors,
  showAllErrors,
}) {
  const id = useId();
  const [touched, setTouched] = useState({});
  const errors = validate(value);

  function messageFor(name) {
    if ((showAllErrors || touched[name]) && errors[name]) return errors[name];
    return serverErrors[name];
  }

  return fields.map(({ name, label, ...inputProps }) => {
    const message = messageFor(name);
    return (
      <Fragment key={name}>
        <label htmlFor={`${id}-${name}`}>{label}</label>
        <input
          id={`${id}-${name}`}
          {...inputProps}
          value={value[name]}
          onChange={(e) => onPatch({ [name]: e.target.value })}
          onBlur={() => setTouched((t) => ({ ...t, [name]: true }))}
        />
        {message && <p>{message}</p>}
      </Fragment>
    );
  });
}

// One list (images or links): the saved items with Delete, then either the draft with Add /
// Cancel or the button that starts a draft (disabled at the limit). onPatch, when given, runs
// after every change to an item (images pass autoFillDimensions).
function ItemList({
  legend,
  listName,
  noun,
  max,
  emptyItem,
  fields,
  validate,
  items,
  setItems,
  fieldErrors,
  onReindex,
  onPatch,
}) {
  // The unsaved new item, or null when its fields are hidden.
  const [draft, setDraft] = useState(null);
  // Set once "Add" is pressed on an invalid draft, so all its messages show.
  const [draftTried, setDraftTried] = useState(false);

  // Each returns a function that applies a functional update to one item.
  function applyToItem(key) {
    return (update) =>
      setItems((list) =>
        list.map((item) => (item.key === key ? update(item) : item)),
      );
  }
  function applyToDraft(update) {
    setDraft((current) => (current ? update(current) : current));
  }

  function patch(apply, changes) {
    apply((item) => ({ ...item, ...changes }));
    onPatch?.(changes, apply);
  }

  function startDraft() {
    setDraft({ ...emptyItem, key: crypto.randomUUID() });
    setDraftTried(false);
  }

  function addDraft() {
    if (Object.keys(validate(draft)).length > 0) {
      setDraftTried(true);
      return;
    }
    setItems((list) => [...list, draft]);
    setDraft(null);
    onReindex();
  }

  function deleteItem(key) {
    setItems((list) => list.filter((item) => item.key !== key));
    onReindex();
  }

  const full = items.length >= max;

  return (
    <fieldset>
      <legend>{legend}</legend>
      {fieldErrors[listName] && <p>{fieldErrors[listName]}</p>}

      {items.map((item, index) => (
        <div key={item.key}>
          <ItemFields
            fields={fields}
            validate={validate}
            value={item}
            onPatch={(changes) => patch(applyToItem(item.key), changes)}
            serverErrors={serverErrorsFor(fieldErrors, listName, index)}
            showAllErrors
          />
          <button type="button" onClick={() => deleteItem(item.key)}>
            Delete
          </button>
        </div>
      ))}

      {draft ? (
        <div>
          <ItemFields
            fields={fields}
            validate={validate}
            value={draft}
            onPatch={(changes) => patch(applyToDraft, changes)}
            serverErrors={{}}
            showAllErrors={draftTried}
          />
          <button type="button" onClick={addDraft}>
            Add
          </button>
          <button type="button" onClick={() => setDraft(null)}>
            Cancel
          </button>
        </div>
      ) : (
        <button type="button" disabled={full} onClick={startDraft}>
          {full ? `Maximum of ${max} ${noun}s` : `Add ${noun}`}
        </button>
      )}
    </fieldset>
  );
}

export default function ImageLinkFields({
  images,
  links,
  setImages,
  setLinks,
  fieldErrors,
  onReindex,
}) {
  return (
    <>
      <ItemList
        legend="Images"
        listName="images"
        noun="image"
        max={MAX_IMAGES}
        emptyItem={EMPTY_IMAGE}
        fields={IMAGE_FIELDS}
        validate={validateImage}
        items={images}
        setItems={setImages}
        fieldErrors={fieldErrors}
        onReindex={onReindex}
        onPatch={autoFillDimensions}
      />
      <ItemList
        legend="Links"
        listName="links"
        noun="link"
        max={MAX_LINKS}
        emptyItem={EMPTY_LINK}
        fields={LINK_FIELDS}
        validate={validateLink}
        items={links}
        setItems={setLinks}
        fieldErrors={fieldErrors}
        onReindex={onReindex}
      />
    </>
  );
}
