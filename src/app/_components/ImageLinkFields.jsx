// ImageLinkFields: shared image/link "add another" fields for Create and Edit a Post.
// Handles add/remove, validation, limits (5 images, 10 links) and image width/height auto-fill.
//
// Controlled by the parent form, which owns the images and links arrays and passes their React
// state setters (setImages / setLinks) so every change is a functional update. That matters for
// auto-fill: an image load finishes later, and must patch the item as it is *then*, not as it
// was when the URL was typed. Each item has a client-only `key` for React lists (stripped before
// sending); items loaded for Edit also keep their real `id` so the backend can reconcile them.
//
// A new item starts as a draft held here; it joins the array only when its "Add" button
// validates it. fieldErrors is the API's error.fields, keyed by full path ("images.0.src").

"use client";

import { useId, useState } from "react";
import { isHttpsUrl, validateImage, validateLink } from "../_lib/validation";

const MAX_IMAGES = 5;
const MAX_LINKS = 10;

export const EMPTY_IMAGE = { src: "", width: "", height: "", altText: "" };
export const EMPTY_LINK = { name: "", url: "" };

export function newItemKey() {
  return crypto.randomUUID();
}

// Loads the image in the background and reports its natural size. If it fails to load,
// nothing is reported and Width / Height stay as they are for manual entry.
function loadDimensions(src, onLoad) {
  if (!isHttpsUrl(src)) return;
  const image = new Image();
  image.onload = () => onLoad(image.naturalWidth, image.naturalHeight);
  image.src = src.trim();
}

// The inputs for one image (a saved item or the draft). Messages show for a field once it has
// been left, or for every field when showAllErrors is set; otherwise the server's message shows.
function ImageFields({ value, onPatch, serverErrors, showAllErrors }) {
  const id = useId();
  const [touched, setTouched] = useState({});
  const errors = validateImage(value);

  function messageFor(field) {
    if ((showAllErrors || touched[field]) && errors[field])
      return errors[field];
    return serverErrors[field];
  }

  function field(name, label, type = "text") {
    const message = messageFor(name);
    return (
      <>
        <label htmlFor={`${id}-${name}`}>{label}</label>
        <input
          id={`${id}-${name}`}
          type={type}
          value={value[name]}
          onChange={(e) => onPatch({ [name]: e.target.value })}
          onBlur={() => setTouched((t) => ({ ...t, [name]: true }))}
          {...(type === "number" ? { min: 1, max: 10000, step: 1 } : {})}
          {...(name === "altText" ? { maxLength: 200 } : {})}
        />
        {message && <p>{message}</p>}
      </>
    );
  }

  return (
    <>
      {field("src", "Image URL", "url")}
      {field("width", "Width", "number")}
      {field("height", "Height", "number")}
      {field("altText", "Alt Text")}
    </>
  );
}

// The inputs for one link (a saved item or the draft). Same message rules as ImageFields.
function LinkFields({ value, onPatch, serverErrors, showAllErrors }) {
  const id = useId();
  const [touched, setTouched] = useState({});
  const errors = validateLink(value);

  function messageFor(field) {
    if ((showAllErrors || touched[field]) && errors[field])
      return errors[field];
    return serverErrors[field];
  }

  function field(name, label, type, maxLength) {
    const message = messageFor(name);
    return (
      <>
        <label htmlFor={`${id}-${name}`}>{label}</label>
        <input
          id={`${id}-${name}`}
          type={type}
          maxLength={maxLength}
          value={value[name]}
          onChange={(e) => onPatch({ [name]: e.target.value })}
          onBlur={() => setTouched((t) => ({ ...t, [name]: true }))}
        />
        {message && <p>{message}</p>}
      </>
    );
  }

  return (
    <>
      {field("name", "Link Name", "text", 100)}
      {field("url", "URL", "url")}
    </>
  );
}

// Picks this item's server messages out of error.fields: "images.2.src" → { src: "..." }.
function serverErrorsFor(fieldErrors, list, index) {
  const prefix = `${list}.${index}.`;
  const errors = {};
  for (const [path, message] of Object.entries(fieldErrors)) {
    if (path.startsWith(prefix)) errors[path.slice(prefix.length)] = message;
  }
  return errors;
}

export default function ImageLinkFields({
  images,
  links,
  setImages,
  setLinks,
  fieldErrors = {},
  onReindex,
}) {
  // The unsaved new item for each list, or null when its fields are hidden.
  const [draftImage, setDraftImage] = useState(null);
  const [draftLink, setDraftLink] = useState(null);
  // Set once "Add" is pressed on an invalid draft, so all its messages show.
  const [draftImageTried, setDraftImageTried] = useState(false);
  const [draftLinkTried, setDraftLinkTried] = useState(false);

  // --- Images ---

  function patchImage(key, patch) {
    setImages((list) =>
      list.map((image) => (image.key === key ? { ...image, ...patch } : image)),
    );
    if (patch.src !== undefined) {
      loadDimensions(patch.src, (width, height) =>
        // Only fill in if the URL is still the one that was loaded.
        setImages((list) =>
          list.map((image) =>
            image.key === key && image.src === patch.src
              ? { ...image, width: String(width), height: String(height) }
              : image,
          ),
        ),
      );
    }
  }

  function patchDraftImage(patch) {
    setDraftImage((draft) => ({ ...draft, ...patch }));
    if (patch.src !== undefined) {
      loadDimensions(patch.src, (width, height) =>
        setDraftImage((draft) =>
          draft && draft.src === patch.src
            ? { ...draft, width: String(width), height: String(height) }
            : draft,
        ),
      );
    }
  }

  function addDraftImage() {
    if (Object.keys(validateImage(draftImage)).length > 0) {
      setDraftImageTried(true);
      return;
    }
    setImages((list) => [...list, draftImage]);
    setDraftImage(null);
    onReindex?.();
  }

  function deleteImage(key) {
    setImages((list) => list.filter((image) => image.key !== key));
    onReindex?.();
  }

  // --- Links ---

  function patchLink(key, patch) {
    setLinks((list) =>
      list.map((link) => (link.key === key ? { ...link, ...patch } : link)),
    );
  }

  function addDraftLink() {
    if (Object.keys(validateLink(draftLink)).length > 0) {
      setDraftLinkTried(true);
      return;
    }
    setLinks((list) => [...list, draftLink]);
    setDraftLink(null);
    onReindex?.();
  }

  function deleteLink(key) {
    setLinks((list) => list.filter((link) => link.key !== key));
    onReindex?.();
  }

  const imagesFull = images.length >= MAX_IMAGES;
  const linksFull = links.length >= MAX_LINKS;

  return (
    <>
      <fieldset>
        <legend>Images</legend>
        {fieldErrors.images && <p>{fieldErrors.images}</p>}

        {images.map((image, index) => (
          <div key={image.key}>
            <ImageFields
              value={image}
              onPatch={(patch) => patchImage(image.key, patch)}
              serverErrors={serverErrorsFor(fieldErrors, "images", index)}
              showAllErrors
            />
            <button type="button" onClick={() => deleteImage(image.key)}>
              Delete
            </button>
          </div>
        ))}

        {draftImage ? (
          <div>
            <ImageFields
              value={draftImage}
              onPatch={patchDraftImage}
              serverErrors={{}}
              showAllErrors={draftImageTried}
            />
            <button type="button" onClick={addDraftImage}>
              Add
            </button>
            <button type="button" onClick={() => setDraftImage(null)}>
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={imagesFull}
            onClick={() => {
              setDraftImage({ ...EMPTY_IMAGE, key: newItemKey() });
              setDraftImageTried(false);
            }}
          >
            {imagesFull ? `Maximum of ${MAX_IMAGES} images` : "Add image"}
          </button>
        )}
      </fieldset>

      <fieldset>
        <legend>Links</legend>
        {fieldErrors.links && <p>{fieldErrors.links}</p>}

        {links.map((link, index) => (
          <div key={link.key}>
            <LinkFields
              value={link}
              onPatch={(patch) => patchLink(link.key, patch)}
              serverErrors={serverErrorsFor(fieldErrors, "links", index)}
              showAllErrors
            />
            <button type="button" onClick={() => deleteLink(link.key)}>
              Delete
            </button>
          </div>
        ))}

        {draftLink ? (
          <div>
            <LinkFields
              value={draftLink}
              onPatch={(patch) =>
                setDraftLink((draft) => ({ ...draft, ...patch }))
              }
              serverErrors={{}}
              showAllErrors={draftLinkTried}
            />
            <button type="button" onClick={addDraftLink}>
              Add
            </button>
            <button type="button" onClick={() => setDraftLink(null)}>
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={linksFull}
            onClick={() => {
              setDraftLink({ ...EMPTY_LINK, key: newItemKey() });
              setDraftLinkTried(false);
            }}
          >
            {linksFull ? `Maximum of ${MAX_LINKS} links` : "Add link"}
          </button>
        )}
      </fieldset>
    </>
  );
}
