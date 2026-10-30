// ImageField: one image's fields in the Add / Edit image dialog of Create / Edit Post. The site
// owner picks a file (jpg, png or webp, at most 10 MB, checked before it is kept) and writes its
// alt text. A picked file stays in the browser until Submit (docs/flows.md → Post body dialogs):
// it is shown from an object URL, and its size is read by loading that URL, so src, width and
// height are set together once it loads. An existing image shows from its src until another file
// is picked. The image it replaces may still be the post's (the dialog can be cancelled), so this
// field never lets go of an object URL it didn't load: PostForm does, once the dialog closes.
// Once a file is picked, blank alt text shows a note saying it is needed to insert the image.

"use client";

import { useId, useRef, useState } from "react";
import Image from "next/image";
import CharacterCount from "./CharacterCount";
import FieldLabel from "./FieldLabel";
import { imageFileError, isBlank, validateImage } from "../_lib/validation";

import styles from "../_styling/postForm.module.css";

const UNREADABLE_MESSAGE = "This file can't be read as an image.";
const ALT_TEXT_NOTE = "Alt text is required to insert the image.";

// Picks one image's server messages out of error.fields by its path prefix:
// ("body.2.image.") turns "body.2.image.src" into { src: "..." }.
export function serverErrorsFor(fieldErrors, prefix) {
  const errors = {};
  for (const [path, message] of Object.entries(fieldErrors)) {
    if (path.startsWith(prefix)) errors[path.slice(prefix.length)] = message;
  }
  return errors;
}

// Lets go of a picked file's object URL once nothing shows it any more. A stored image's src is
// a Cloudinary URL and needs nothing.
export function releaseObjectUrl(src) {
  if (src?.startsWith("blob:")) URL.revokeObjectURL(src);
}

export default function ImageField({ value, onPatch, serverErrors }) {
  const id = useId();
  const [fileError, setFileError] = useState(null);
  const [altTextTouched, setAltTextTouched] = useState(false);
  // The object URL of the file being loaded. A newer pick replaces it, so an older file that
  // finishes loading late is dropped instead of overwriting the newer one.
  const loadingUrl = useRef(null);
  const errors = validateImage(value);

  function handleFileChange(event) {
    const input = event.target;
    const file = input.files[0];
    if (!file) return;
    // Clearing the input lets the same file be picked again after it was refused.
    input.value = "";

    const error = imageFileError(file);
    setFileError(error);
    if (error) return;

    releaseObjectUrl(loadingUrl.current);
    const url = URL.createObjectURL(file);
    loadingUrl.current = url;

    const image = new window.Image();
    image.onload = () => {
      if (loadingUrl.current !== url) return;
      loadingUrl.current = null;
      onPatch({
        file,
        src: url,
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };
    image.onerror = () => {
      if (loadingUrl.current !== url) return;
      loadingUrl.current = null;
      releaseObjectUrl(url);
      setFileError(UNREADABLE_MESSAGE);
    };
    image.src = url;
  }

  const fileMessage = fileError ?? serverErrors.src;
  // The note covers blank alt text once there is an image, so the site owner who just picked one
  // sees what is still missing before leaving the field.
  const showAltTextNote = !isBlank(value.src) && isBlank(value.altText);
  const altTextMessage =
    altTextTouched && errors.altText && !showAltTextNote
      ? errors.altText
      : serverErrors.altText;

  return (
    <>
      <label htmlFor={`${id}-file`}>Image</label>
      {!isBlank(value.src) && (
        <>
          <Image
            src={value.src}
            width={value.width}
            height={value.height}
            alt={value.altText.trim()}
            unoptimized
            className={styles.thumbnail}
          />
          <p className={styles.message}>
            <i>*Choose another file to replace this image.</i>
          </p>
        </>
      )}
      <input
        id={`${id}-file`}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className={styles.input}
      />
      {fileMessage && <p className="fieldError">{fileMessage}</p>}

      <FieldLabel
        htmlFor={`${id}-altText`}
        label="Alt Text"
        note={showAltTextNote ? ALT_TEXT_NOTE : undefined}
        count={
          <CharacterCount
            id={`${id}-altTextCount`}
            value={value.altText}
            max={200}
          />
        }
      />
      <input
        id={`${id}-altText`}
        type="text"
        maxLength={200}
        aria-describedby={`${id}-altTextCount`}
        value={value.altText}
        onChange={(e) => onPatch({ altText: e.target.value })}
        onBlur={() => setAltTextTouched(true)}
        className={styles.input}
      />
      {altTextMessage && <p className="fieldError">{altTextMessage}</p>}
    </>
  );
}
